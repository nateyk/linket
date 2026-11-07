<?php

namespace App\Console\Commands;

use App\CreatorAi\Support\ChatGptProTester;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('creator-ai:seed-test-pro')]
#[Description('Create one dedicated verified Pro creator for ChatGPT testing')]
class SeedChatGptProTesterCommand extends Command
{
    public function handle(ChatGptProTester $tester): int
    {
        $status = $tester->seed();

        if ($status === 'skipped') {
            $this->info('ChatGPT test creator skipped. Set LINKET_TEST_PRO_EMAIL and LINKET_TEST_PRO_PASSWORD to create one.');

            return self::SUCCESS;
        }

        if ($status === 'seeded') {
            $this->info('Verified Pro ChatGPT test creator is ready for '.config('creator_ai.test_pro_email').'.');

            return self::SUCCESS;
        }

        $this->error(match ($status) {
            'invalid' => 'LINKET_TEST_PRO_EMAIL must be an email and LINKET_TEST_PRO_PASSWORD must be at least 12 characters.',
            'existing_account' => 'LINKET_TEST_PRO_EMAIL already belongs to another account. Choose a new test email.',
            'missing_plan' => 'The paid Linket Pro plan or its ETB price is missing, so the test creator was not created.',
            default => 'The test creator was saved but did not qualify as verified Pro.',
        });

        return self::FAILURE;
    }
}
