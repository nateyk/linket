<?php

namespace Common\Billing\Invoices;

use Common\Billing\Invoices\Invoice;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use LaravelDaily\Invoices\Classes\Buyer;
use LaravelDaily\Invoices\Classes\InvoiceItem;
use LaravelDaily\Invoices\Classes\Seller;
use LaravelDaily\Invoices\Invoice as InvoicePDF;

class InvoiceController extends Controller
{
    public function show(string $uuid)
    {
        $invoice = Invoice::query()
            ->where('uuid', $uuid)
            ->with(
                'subscription.product',
                'subscription.user',
                'subscription.price',
            )
            ->firstOrFail();

        Gate::authorize('show', $invoice);

        $buyer = new Buyer([
            'name' => $invoice->subscription->user->name,
            'custom_fields' => [
                'email' => $invoice->subscription->user->email,
            ],
        ]);

        $seller = new Seller();
        $seller->name = config('app.name');
        $seller->address = settings('billing.invoice.address');
        $seller->phone = null;
        $seller->custom_fields = [];
        $seller->code = null;
        $seller->vat = null;

        $item = InvoiceItem::make(
            __(':name subscription dues', [
                'name' => $invoice->subscription->product->name,
            ]),
        )->pricePerUnit($invoice->subscription->price->amount);

        $invoice = InvoicePDF::make()
            ->serialNumberFormat('{SERIES}')
            ->series($invoice->id)
            ->buyer($buyer)
            ->seller($seller)
            ->addItem($item)
            ->notes(settings('billing.invoice.notes') ?? '')
            ->date($invoice->created_at)
            ->payUntilDays(0);

        return $invoice->stream();
    }
}
