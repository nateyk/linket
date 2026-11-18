<?php

use Common\Billing\Gateways\Paypal\PaypalWebhookController;
use Common\Billing\Gateways\Stripe\StripeWebhookController;
use App\Payments\Controllers\ChapaWebhookController;
use App\Payments\Controllers\ChapaCallbackController;
use Illuminate\Support\Facades\Route;
use App\Storefront\Controllers\ChapaStorefrontReturnController;
use App\Storefront\Controllers\DownloadController;
use App\Storefront\Controllers\StorefrontCheckoutController;
use App\Telegram\Controllers\TelegramWebhookController;

// PAYPAL
Route::post('billing/paypal/webhook', [
    PaypalWebhookController::class,
    'handleWebhook',
]);

// STRIPE
Route::post('billing/stripe/webhook', [
    StripeWebhookController::class,
    'handleWebhook',
]);

Route::post('billing/chapa/webhook', [
    ChapaWebhookController::class,
    'handle',
]);
// The retired provider has no active webhook receiver. Keep a hard 404 rather than
// allowing any legacy request to reach payment or fulfillment code.
Route::post('billing/verify-et/webhook', static fn () => abort(404));
Route::post('billing/verify-et/experiment-webhook', static fn () => abort(404));

Route::post('integrations/telegram/webhook', [TelegramWebhookController::class, 'handle']);
Route::match(['get', 'post'], 'billing/chapa/callback/{txRef}', [
    ChapaCallbackController::class,
    'handle',
]);
Route::match(['get', 'post'], 'storefront/chapa/return/{txRef}', [
    ChapaStorefrontReturnController::class,
    'handle',
]);

Route::get('storefront/downloads/{token}', [DownloadController::class, 'show'])->name('storefront.download');
Route::get('storefront/orders/{order}/success', [StorefrontCheckoutController::class, 'success'])->name('storefront.order.success');
