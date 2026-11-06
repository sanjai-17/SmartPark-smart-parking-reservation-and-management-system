import uuid
from abc import ABC, abstractmethod
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class PaymentResult(BaseModel):
    """Normalized payment outcome returned by all payment adapters."""
    success: bool
    transaction_reference: str
    gateway_reference: str
    amount: Decimal
    payment_method: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class UnknownPaymentMethodError(ValueError):
    """Raised when an unsupported payment method is requested."""
    pass


class InvalidPaymentAmountError(ValueError):
    """Raised when payment amount is negative or invalid."""
    pass


# =====================================================================
# Incompatible Simulated 3rd Party Gateways (Adaptees)
# =====================================================================

class UPIGateway:
    """
    Simulated 3rd party UPI provider interface.
    Accepts amounts strictly in integer PAISE (1 Rupee = 100 Paise) and a Virtual Payment Address (VPA).
    """
    def process_upi_collect(self, vpa: str, amount_paise: int) -> Dict[str, Any]:
        if not vpa or "@" not in vpa:
            return {
                "upi_status": "FAILED",
                "error_code": "INVALID_VPA",
                "upi_ref_id": None,
                "msg": f"Invalid Virtual Payment Address '{vpa}'. Must contain @handle.",
            }
        
        # Test simulated declined dummy handle
        if "fail" in vpa.lower() or "declined" in vpa.lower():
            return {
                "upi_status": "FAILED",
                "error_code": "PSP_REJECTED",
                "upi_ref_id": f"UPI-FAIL-{uuid.uuid4().hex[:8].upper()}",
                "msg": "Payment rejected by receiving bank or PSP.",
            }

        txn_ref = f"UPI-NPCI-{uuid.uuid4().hex[:10].upper()}"
        return {
            "upi_status": "SUCCESS",
            "upi_ref_id": txn_ref,
            "amount_paid_paise": amount_paise,
            "vpa_verified": True,
            "msg": f"UPI transfer of {amount_paise} paise successfully cleared.",
        }


class CardGateway:
    """
    Simulated 3rd party Credit/Debit Card gateway.
    Accepts card token/identifier and amount as floating-point / decimal rupees.
    Returns banking authorization code and state string.
    """
    def authorize_and_charge(self, card_token: str, amount_rupees: float) -> Dict[str, Any]:
        clean_token = (card_token or "").strip()
        if len(clean_token) < 4:
            return {
                "state": "DECLINED",
                "auth_code": None,
                "reason": "Invalid card token format or length.",
            }

        if "decline" in clean_token.lower() or "fail" in clean_token.lower():
            return {
                "state": "DECLINED",
                "auth_code": None,
                "reason": "Card issuer declined transaction (insufficient funds or fraud check).",
            }

        auth_code = f"AUTH-CRD-{uuid.uuid4().hex[:8].upper()}"
        return {
            "state": "APPROVED",
            "auth_code": auth_code,
            "cleared_amount": amount_rupees,
            "reason": "Transaction approved by card network.",
        }


class WalletService:
    """
    Simulated 3rd party digital wallet ecosystem (e.g., Paytm, PhonePe, AmazonPay).
    Accepts wallet account ID and amount in Decimal rupees.
    """
    def execute_wallet_debit(self, wallet_id: str, debit_inr: Decimal) -> Dict[str, Any]:
        clean_id = (wallet_id or "").strip()
        if not clean_id:
            return {
                "is_cleared": False,
                "wallet_reference": None,
                "failure_reason": "Missing wallet identifier.",
            }

        if "empty" in clean_id.lower() or "fail" in clean_id.lower():
            return {
                "is_cleared": False,
                "wallet_reference": None,
                "failure_reason": "Insufficient balance in digital wallet.",
            }

        wallet_txn = f"WLT-{uuid.uuid4().hex[:8].upper()}"
        return {
            "is_cleared": True,
            "wallet_reference": wallet_txn,
            "closing_balance_info": "Sufficient",
            "failure_reason": None,
        }


# =====================================================================
# Target Interface
# =====================================================================

class PaymentProcessor(ABC):
    """
    Target interface for payment processing.
    All adapters implement this interface, providing a unified pay() contract.
    """
    method_name: str

    @abstractmethod
    def pay(self, amount: Decimal, account: str) -> PaymentResult:
        pass


# =====================================================================
# Concrete Adapters
# =====================================================================

class UPIAdapter(PaymentProcessor):
    """
    Adapter converting unified pay() calls to UPIGateway's process_upi_collect().
    Converts amount in Rupees to integer Paise (e.g. ₹125.50 -> 12550 paise).
    """
    method_name = "UPI"

    def __init__(self, gateway: Optional[UPIGateway] = None):
        self.gateway = gateway or UPIGateway()

    def pay(self, amount: Decimal, account: str) -> PaymentResult:
        if amount <= 0:
            raise InvalidPaymentAmountError("Payment amount must be greater than zero.")

        # Unit conversion: Rupees (Decimal) -> Paise (Integer)
        paise_amount = int((amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        
        # Call incompatible gateway
        raw_resp = self.gateway.process_upi_collect(vpa=account, amount_paise=paise_amount)
        
        # Normalize response
        is_success = raw_resp.get("upi_status") == "SUCCESS"
        ref = raw_resp.get("upi_ref_id") or f"UPI-FAIL-{uuid.uuid4().hex[:6]}"
        txn_ref = f"TXN-UPI-{uuid.uuid4().hex[:12].upper()}"

        return PaymentResult(
            success=is_success,
            transaction_reference=txn_ref,
            gateway_reference=ref,
            amount=amount,
            payment_method=self.method_name,
            message=raw_resp.get("msg", "UPI transaction completed."),
            details={
                "converted_paise": paise_amount,
                "vpa": account,
                "raw_status": raw_resp.get("upi_status"),
            },
        )


class CardAdapter(PaymentProcessor):
    """
    Adapter converting unified pay() calls to CardGateway's authorize_and_charge().
    Converts Decimal rupees to float rupees and maps card authorization status.
    """
    method_name = "Card"

    def __init__(self, gateway: Optional[CardGateway] = None):
        self.gateway = gateway or CardGateway()

    def pay(self, amount: Decimal, account: str) -> PaymentResult:
        if amount <= 0:
            raise InvalidPaymentAmountError("Payment amount must be greater than zero.")

        rupees_float = float(amount)
        raw_resp = self.gateway.authorize_and_charge(card_token=account, amount_rupees=rupees_float)

        is_success = raw_resp.get("state") == "APPROVED"
        auth_code = raw_resp.get("auth_code") or f"CRD-DECL-{uuid.uuid4().hex[:6]}"
        txn_ref = f"TXN-CRD-{uuid.uuid4().hex[:12].upper()}"

        return PaymentResult(
            success=is_success,
            transaction_reference=txn_ref,
            gateway_reference=auth_code,
            amount=amount,
            payment_method=self.method_name,
            message=raw_resp.get("reason", "Card transaction completed."),
            details={
                "auth_state": raw_resp.get("state"),
                "card_account": f"****{account[-4:]}" if len(account) >= 4 else account,
            },
        )


class WalletAdapter(PaymentProcessor):
    """
    Adapter converting unified pay() calls to WalletService's execute_wallet_debit().
    """
    method_name = "Wallet"

    def __init__(self, service: Optional[WalletService] = None):
        self.service = service or WalletService()

    def pay(self, amount: Decimal, account: str) -> PaymentResult:
        if amount <= 0:
            raise InvalidPaymentAmountError("Payment amount must be greater than zero.")

        raw_resp = self.service.execute_wallet_debit(wallet_id=account, debit_inr=amount)

        is_success = bool(raw_resp.get("is_cleared"))
        wlt_ref = raw_resp.get("wallet_reference") or f"WLT-ERR-{uuid.uuid4().hex[:6]}"
        txn_ref = f"TXN-WLT-{uuid.uuid4().hex[:12].upper()}"

        msg = "Wallet debit successful." if is_success else raw_resp.get("failure_reason", "Wallet debit failed.")

        return PaymentResult(
            success=is_success,
            transaction_reference=txn_ref,
            gateway_reference=wlt_ref,
            amount=amount,
            payment_method=self.method_name,
            message=msg,
            details={
                "wallet_id": account,
                "cleared": is_success,
            },
        )


# Adapter Registry
_PAYMENT_PROCESSOR_REGISTRY: Dict[str, PaymentProcessor] = {
    "upi": UPIAdapter(),
    "card": CardAdapter(),
    "credit_card": CardAdapter(),
    "debit_card": CardAdapter(),
    "wallet": WalletAdapter(),
}


def get_payment_processor(method: str) -> PaymentProcessor:
    """Resolve payment adapter for given payment method string."""
    if not method or not isinstance(method, str):
        raise UnknownPaymentMethodError("Payment method must be specified as a string.")

    clean_key = method.strip().lower().replace(" ", "").replace("_", "")
    processor = _PAYMENT_PROCESSOR_REGISTRY.get(clean_key)
    if not processor:
        valid = ["UPI", "Card", "Wallet"]
        raise UnknownPaymentMethodError(
            f"Unsupported payment method '{method}'. Supported methods: {', '.join(valid)}"
        )
    return processor
