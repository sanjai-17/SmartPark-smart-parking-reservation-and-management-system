import pytest
from decimal import Decimal
from app.patterns.adapter import (
    UPIAdapter,
    CardAdapter,
    WalletAdapter,
    get_payment_processor,
    UnknownPaymentMethodError,
    InvalidPaymentAmountError,
)


def test_upi_adapter_converts_rupees_to_paise():
    adapter = UPIAdapter()
    amount_inr = Decimal("125.50")
    result = adapter.pay(amount=amount_inr, account="user@okaxis")

    assert result.success == True
    assert result.payment_method == "UPI"
    assert result.amount == amount_inr
    assert result.details["converted_paise"] == 12550
    assert result.transaction_reference.startswith("TXN-UPI-")


def test_upi_adapter_failure_handling():
    adapter = UPIAdapter()
    result = adapter.pay(amount=Decimal("50.00"), account="user_fail@upi")
    assert result.success == False


def test_card_adapter_success_and_declined():
    adapter = CardAdapter()

    # Success case
    res_ok = adapter.pay(amount=Decimal("200.00"), account="4111222233334444")
    assert res_ok.success == True
    assert res_ok.payment_method == "Card"
    assert res_ok.transaction_reference.startswith("TXN-CRD-")

    # Declined case
    res_declined = adapter.pay(amount=Decimal("200.00"), account="decline_card_0000")
    assert res_declined.success == False
    assert "declined" in res_declined.message.lower()


def test_wallet_adapter_success_and_insufficient():
    adapter = WalletAdapter()

    # Success
    res_ok = adapter.pay(amount=Decimal("75.00"), account="WLT_USER_7788")
    assert res_ok.success == True
    assert res_ok.payment_method == "Wallet"

    # Empty / Fail
    res_fail = adapter.pay(amount=Decimal("75.00"), account="WLT_EMPTY_0000")
    assert res_fail.success == False


def test_payment_processor_registry_resolution():
    assert isinstance(get_payment_processor("upi"), UPIAdapter)
    assert isinstance(get_payment_processor("Card"), CardAdapter)
    assert isinstance(get_payment_processor("wallet"), WalletAdapter)

    with pytest.raises(UnknownPaymentMethodError):
        get_payment_processor("BitcoinCrypto")


def test_negative_payment_amount_rejected():
    adapter = UPIAdapter()
    with pytest.raises(InvalidPaymentAmountError):
        adapter.pay(amount=Decimal("-10.00"), account="user@upi")
