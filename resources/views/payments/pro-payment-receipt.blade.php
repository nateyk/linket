<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Pro subscription payment receipt</title>
    <style>
        body { color: #172033; font-family: DejaVu Sans, sans-serif; font-size: 12px; line-height: 1.6; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .muted { color: #64748b; }
        .receipt { border: 1px solid #cbd5e1; margin-top: 24px; padding: 20px; }
        .row { border-bottom: 1px solid #e2e8f0; padding: 10px 0; }
        .label { color: #64748b; display: inline-block; width: 38%; }
        .value { font-weight: bold; }
        .notice { margin-top: 24px; }
    </style>
</head>
<body>
    <h1>Linket Pro payment receipt</h1>
    <p class="muted">Payment receipt — not a tax invoice</p>
    <div class="receipt">
        <div class="row"><span class="label">Receipt ID</span><span class="value">{{ $payment->receipt_number }}</span></div>
        <div class="row"><span class="label">Creator</span><span class="value">{{ $creator->name }} ({{ $creator->email }})</span></div>
        <div class="row"><span class="label">Amount received</span><span class="value">ETB {{ number_format($payment->amount_cents / 100, 2) }}</span></div>
        <div class="row"><span class="label">Payment date</span><span class="value">{{ $payment->paid_at->timezone('Africa/Addis_Ababa')->format('Y-m-d H:i T') }}</span></div>
        <div class="row"><span class="label">Transaction reference</span><span class="value">{{ $verification->reference }}</span></div>
        <div class="row"><span class="label">Subscription period</span><span class="value">{{ $payment->subscription_period_start->timezone('Africa/Addis_Ababa')->toDateString() }} to {{ $payment->subscription_period_end->timezone('Africa/Addis_Ababa')->toDateString() }}</span></div>
        <p class="notice">This receipt confirms a payment verified by Linket. It is not a tax invoice.</p>
    </div>
</body>
</html>
