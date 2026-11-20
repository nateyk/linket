<?php

namespace Common\Csv;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CsvExportReadyNotif extends Notification
{
    use Queueable;

    public function __construct(
        protected CsvExport $csvExport,
        protected string $exportName
    ) {
    }

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): ReactEmailMailable
    {
        $subject = $this->primaryLine();

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            $subject,
            [
                $subject,
                __('This download link will only work if you are logged in as user who has requested the export and it will expire in one day.'),
            ],
            __('Download'),
            $this->csvExport->downloadLink(),
        );
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable): array
    {
        return [
            'mainAction' => [
                'Label' => 'Download',
                'action' => $this->csvExport->downloadLink(),
            ],
            'lines' => [
                [
                    'content' => $this->primaryLine(),
                ],
                [
                    'content' => __(
                        'This download link will expire in one day.',
                    ),
                ],
            ],
        ];
    }

    protected function primaryLine(): string
    {
        return __('“:name“ CSV export is ready to download.', [
            'name' => ucfirst($this->exportName),
        ]);
    }
}
