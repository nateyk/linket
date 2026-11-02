<?php

use Common\Billing\Gateways\Paypal\PaypalWebhookController;
use Common\Billing\Gateways\Stripe\StripeWebhookController;
use App\Payments\Controllers\ChapaWebhookController;
use App\Payments\Controllers\ChapaCallbackController;
use App\Payments\Controllers\VerifyEtWebhookController;
use App\Payments\Controllers\VerifyEtExperimentWebhookController;
use Illuminate\Support\Facades\Route;
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
Route::post('billing/verify-et/webhook', [VerifyEtWebhookController::class, 'handle']);
Route::post('billing/verify-et/experiment-webhook', [VerifyEtExperimentWebhookController::class, 'handle']);

Route::post('integrations/telegram/webhook', [TelegramWebhookController::class, 'handle']);
Route::match(['get', 'post'], 'billing/chapa/callback/{txRef}', [
    ChapaCallbackController::class,
    'handle',
]);

Route::get('storefront/downloads/{token}', [DownloadController::class, 'show'])->name('storefront.download');
Route::get('storefront/orders/{order}/success', [StorefrontCheckoutController::class, 'success'])->name('storefront.order.success');
