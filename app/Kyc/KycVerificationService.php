<?php

namespace App\Kyc;

use App\Kyc\Models\KycVerification;
use App\Kyc\Notifications\KycPendingAdminNotification;
use App\Kyc\Notifications\KycStatusChanged;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class KycVerificationService
{
    private const DISK = 'local';

    private const DOCUMENT_KEYS = [
        KycVerification::DOCUMENT_TYPE_NATIONAL_ID => ['front_of_id', 'back_of_id'],
        KycVerification::DOCUMENT_TYPE_PASSPORT => ['passport'],
    ];

    public function submit(User $user, array $data): KycVerification
    {
        if ($user->isKycVerified() || $user->isKycPending()) {
            throw ValidationException::withMessages([
                'status' => __('You already have a verification request being processed.'),
            ]);
        }

        $this->validateSubmission($data);

        $documentType = $data['document_type'];
        $documents = [];
        foreach (self::DOCUMENT_KEYS[$documentType] as $key) {
            $documents[$key] = $this->storeDocument($user, $data["{$key}_file"]);
        }
        if (settings('kyc.selfie_verification', true)) {
            $documents['selfie'] = $this->storeDocument($user, $data['selfie_file']);
        }

        $kycVerification = KycVerification::create([
            'user_id' => $user->id,
            'document_type' => $documentType,
            'document_number' => trim($data['document_number']),
            'documents' => $documents,
            'status' => KycVerification::STATUS_PENDING,
        ]);

        $user->kyc_status = KycVerification::STATUS_PENDING;
        $user->save();

        Notification::send(
            User::query()->whereHasPermission('admin')->get(),
            new KycPendingAdminNotification($kycVerification),
        );

        return $kycVerification;
    }

    public function approve(KycVerification $kycVerification, User $reviewer): KycVerification
    {
        $this->assertPending($kycVerification);
        $kycVerification->update([
            'status' => KycVerification::STATUS_APPROVED,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'rejection_reason' => null,
        ]);

        $user = $kycVerification->user;
        $user->kyc_status = KycVerification::STATUS_APPROVED;
        $user->save();

        $user->notify(new KycStatusChanged(KycVerification::STATUS_APPROVED));

        return $kycVerification;
    }

    public function reject(
        KycVerification $kycVerification,
        User $reviewer,
        string $reason,
    ): KycVerification {
        $this->assertPending($kycVerification);
        $kycVerification->update([
            'status' => KycVerification::STATUS_REJECTED,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason,
        ]);

        $user = $kycVerification->user;
        $user->kyc_status = KycVerification::STATUS_REJECTED;
        $user->save();

        $user->notify(new KycStatusChanged(KycVerification::STATUS_REJECTED, $reason));

        return $kycVerification;
    }

    public function documentPath(KycVerification $kycVerification, string $key): ?string
    {
        return Arr::get((array) $kycVerification->documents, $key);
    }

    public function deleteDocumentFiles(KycVerification $kycVerification): void
    {
        foreach ((array) $kycVerification->documents as $path) {
            if (is_string($path)) {
                Storage::disk(self::DISK)->delete($path);
            }
        }
    }

    private function validateSubmission(array $data): void
    {
        $documentType = $data['document_type'] ?? null;
        $fileKeys = $documentType === KycVerification::DOCUMENT_TYPE_PASSPORT
            ? ['passport_file']
            : ['front_of_id_file', 'back_of_id_file'];

        if (settings('kyc.selfie_verification', true)) {
            $fileKeys[] = 'selfie_file';
        }

        $rules = [
            'document_type' => [
                'required',
                'string',
                'in:' . KycVerification::DOCUMENT_TYPE_NATIONAL_ID . ',' . KycVerification::DOCUMENT_TYPE_PASSPORT,
            ],
            'document_number' => ['required', 'string', 'max:64'],
            ...array_fill_keys($fileKeys, ['required', 'image', 'mimes:jpeg,jpg,png', 'max:4096']),
        ];

        $validator = validator($data, $rules);
        if ($validator->fails()) {
            throw ValidationException::withMessages($validator->errors()->messages());
        }
    }

    private function storeDocument(User $user, UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $fileName = \Illuminate\Support\Str::random(20) . '.' . $extension;
        $directory = "kyc/docs/{$user->id}";
        Storage::disk(self::DISK)->putFileAs($directory, $file, $fileName);
        return "$directory/$fileName";
    }

    private function assertPending(KycVerification $kycVerification): void
    {
        if (!$kycVerification->isPending()) {
            throw ValidationException::withMessages([
                'status' => __('This verification request can no longer be changed.'),
            ]);
        }
    }
}
