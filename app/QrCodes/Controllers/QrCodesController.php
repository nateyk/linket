<?php

namespace App\QrCodes\Controllers;

use App\Links\Controllers\FallbackRouteController;
use App\QrCodes\Actions\CrupdateQrCode;
use App\QrCodes\Actions\DeleteQrCodes;
use App\QrCodes\Jobs\ExportQrCodesCsv;
use App\QrCodes\Models\QrCode;
use App\QrCodes\QueryBuilder\QrCodeQueryBuilder;
use App\QrCodes\Requests\CrupdateQrCodeRequest;
use App\QrCodes\Resources\QrCodeResource;
use Common\Csv\CsvExport;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Common\API\ExcludeRouteFromPublicDocs;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

#[Group('QR Codes', weight: 2)]
class QrCodesController extends Controller
{
    /**
     * List all QR codes.
     *
     * @operationId listQrCodes
     */
    public function index(Request $request)
    {
        Gate::authorize('index', QrCode::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'linkeable_type' => 'string',
            'name' => 'string',
            'is_archived' => 'string',
            'expires_at' => 'string',
            'created_at' => 'string',
        ]);

        $pagination = (new QrCodeQueryBuilder($data))->paginate();

        return QrCodeResource::collection($pagination);
    }

    /**
     * Retrieve a QR code.
     *
     * @operationId retrieveQrCode
     */
    public function show(int $id)
    {
        $qrCode = QrCode::query()->findOrFail($id);

        Gate::authorize('show', $qrCode);

        $qrCode->loadMissing([
            'linkeable.rules',
            'rules',
            'user',
            'tags',
            'pixels',
        ]);

        return new QrCodeResource($qrCode);
    }

    /**
     * Create a QR code.
     *
     * @operationId createQrCode
     */
    public function store(CrupdateQrCodeRequest $request)
    {
        Gate::authorize('store', QrCode::class);

        $qrCode = (new CrupdateQrCode())->execute($request->validated());

        return new QrCodeResource($qrCode->loadMissing('linkeable'));
    }

    /**
     * Update a QR code.
     *
     * @operationId updateQrCode
     */
    public function update(int $id, CrupdateQrCodeRequest $request)
    {
        $qrCode = QrCode::query()->findOrFail($id);

        Gate::authorize('update', $qrCode);

        (new CrupdateQrCode())->execute($request->validated(), qrCode: $qrCode);

        return new QrCodeResource($qrCode->loadMissing('linkeable'));
    }

    /**
     * Delete multiple QR codes.
     *
     * @operationId deleteQrCodes
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of QR code IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $qrCodeIds = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [QrCode::class, $qrCodeIds]);

        (new DeleteQrCodes())->execute($qrCodeIds);

        return response()->noContent();
    }

    /**
     * Archive QR codes.
     *
     * @operationId archiveQrCodes
     */
    public function bulkArchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of QR code IDs to archive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [QrCode::class, $ids]);

        QrCode::query()->whereIn('id', $ids)->delete();

        return response()->noContent();
    }

    /**
     * Unarchive QR codes.
     *
     * @operationId unarchiveQrCodes
     */
    public function bulkUnarchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of QR code IDs to unarchive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [QrCode::class, $ids]);

        QrCode::onlyTrashed()->whereIn('id', $ids)->restore();

        return response()->noContent();
    }

    /**
     * Export QR codes as CSV.
     *
     * @operationId exportQrCodesCsv
     */
    #[ExcludeRouteFromPublicDocs]
    public function exportCsv(Request $request)
    {
        $this->middleware('auth');

        $request->validate([
            'type' => 'required|string',
        ]);

        $forUser = null;
        if (request('type') === 'all') {
            Gate::authorize('index', QrCode::class);
        } else {
            $forUser = Auth::user();
        }

        return CsvExport::exportUsing(
            new ExportQrCodesCsv(Auth::id(), $forUser),
        );
    }

    public function redirectToDestination(string $backHalf)
    {
        $qrCode = QrCode::findForRendering($backHalf);
        if (!$qrCode) {
            abort(404);
        }
        return app(FallbackRouteController::class)->handleLinkeable($qrCode);
    }

    public function renderQrCode(QrCode $qrCode)
    {
        $renderer = new ImageRenderer(
            new RendererStyle(256),
            new SvgImageBackEnd(),
        );
        $writer = new Writer($renderer);
        $response = $writer->writeString(url("qr/{$qrCode->back_half}"));

        return response()->stream(
            function () use ($response) {
                echo $response;
            },
            200,
            [
                'Content-Type' => 'image/svg+xml',
                'Content-Length: ' . strlen($response),
            ],
        );
    }
}
