<?php

use Common\Files\Actions\FileUploadValidator;

test('uploaded extension and MIME must both match when policy declares both', function (): void {
    $validator = new FileUploadValidator(accept: ['pdf', 'application/pdf']);

    expect($validator->validate(1024, 'pdf', 'application/pdf'))->toBeNull();
    expect($validator->validate(1024, 'pdf', 'image/png'))->not->toBeNull();
    expect($validator->validate(1024, 'png', 'application/pdf'))->not->toBeNull();
});

test('MIME-only policies still match MIME and reject unrelated types', function (): void {
    $validator = new FileUploadValidator(accept: ['image/*']);
    expect($validator->validate(1024, 'png', 'image/png'))->toBeNull();
    expect($validator->validate(1024, 'pdf', 'application/pdf'))->not->toBeNull();
});

test('extension-only policies preserve extension matching', function (): void {
    $validator = new FileUploadValidator(accept: ['pdf']);
    expect($validator->validate(1024, 'pdf', 'application/pdf'))->toBeNull();
    expect($validator->validate(1024, 'exe', 'application/pdf'))->not->toBeNull();
});
