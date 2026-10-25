<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Flows\AiAgentFlowExecutor;
use Ai\AiAgent\Models\AiAgentSession;
use App\Conversations\Models\Conversation;
use App\Models\User;
use App\Triggers\Conditions\ValuesComparator;
use Carbon\Carbon;
use Common\Auth\UserSession;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class BranchesNode extends BaseNode
{
    protected Collection|null $allPageVisits = null;
    protected UserSession|null $latestUserSession = null;
    protected ValuesComparator $valuesComparator;

    public function __construct(
        protected array $config,
        protected AiAgentFlowExecutor $executor,
    ) {
        $this->valuesComparator = new ValuesComparator();

        parent::__construct($config, $executor);
    }

    public function execute(): bool
    {
        $branches = collect(
            $this->executor->sessionContext->getAllNodes(),
        )->filter(fn($node) => $node['parentId'] === $this->id);

        $elseBranchIndex = $branches->search(
            fn($branch) => $branch['data']['isElseBranch'] ?? false,
        );
        $elseBranch = $branches->pull($elseBranchIndex);

        $matchedBranch = null;

        foreach ($branches as $branch) {
            if ($this->branchMatches($branch)) {
                $matchedBranch = $branch;
                break;
            }
        }

        if (!$matchedBranch) {
            $matchedBranch = $elseBranch;
        }

        $this->executor::$debugLog[] = [
            'event' => 'BranchesNode::branchMatched',
            'data' => [
                'matchedBranch' => $matchedBranch,
            ],
        ];

        $matchedBranchChild = $this->getChildId($matchedBranch['id']);
        if ($matchedBranchChild) {
            $this->executor->goToNode($matchedBranchChild);
            return true;
        }

        return false;
    }

    protected function branchMatches(array $branch)
    {
        $matchType = $branch['data']['branchMatchType'] ?? 'or';
        $groups = collect($branch['data']['conditionGroups']);

        if ($matchType === 'or') {
            return $groups->some(
                fn($group) => $this->conditionGroupMatches($group),
            );
        } else {
            return $groups->every(
                fn($group) => $this->conditionGroupMatches($group),
            );
        }
    }

    protected function conditionGroupMatches(array $conditionGroup): bool
    {
        $matchType = $conditionGroup['matchType'] ?? 'or';
        $conditions = collect($conditionGroup['conditions']);

        if ($conditions->isEmpty()) {
            return true;
        }

        if ($matchType === 'or') {
            return $conditions->some(
                fn($condition) => $this->conditionMatches($condition),
            );
        } else {
            return $conditions->every(
                fn($condition) => $this->conditionMatches($condition),
            );
        }
    }

    protected function conditionMatches(array $condition): bool
    {
        if ($condition['attribute']['type'] === AiAgentSession::MODEL_TYPE) {
            return $this->attributeMatches(
                $condition,
                $this->executor->sessionContext->getSession(),
            );
        }

        if ($condition['attribute']['type'] === User::MODEL_TYPE) {
            return $this->userAttributeMatches($condition);
        }

        if ($condition['attribute']['type'] === Conversation::MODEL_TYPE) {
            return $this->conversationAttributeMatches($condition);
        }

        if ($condition['attribute']['type'] === 'pageVisit') {
            return $this->pageVisitAttributeMatches($condition);
        }

        return false;
    }

    protected function conversationAttributeMatches(array $condition): bool
    {
        if ($condition['attribute']['name'] === 'latestUserMessage') {
            return $this->valuesComparator->compare(
                $this->executor->latestUserMessage->body,
                $condition['value'],
                $condition['operator'],
            );
        }

        return $this->attributeMatches(
            $condition,
            $this->executor->conversation,
        );
    }

    protected function userAttributeMatches(array $condition): bool
    {
        if ($condition['attribute']['name'] === 'signedUp') {
            return $this->valuesComparator->compare(
                $this->getSignedUpDaysAgo(),
                $condition['value'],
                $condition['operator'],
            );
        }

        return $this->attributeMatches($condition, $this->executor->user);
    }

    protected function attributeMatches(
        array $condition,
        User|Conversation|AiAgentSession $model,
    ): bool {
        $attribute = $model->customAttributes->first(
            fn($attribute) => $attribute['key'] ===
                $condition['attribute']['name'],
        );

        $value =
            $attribute?->value ?? $model->{$condition['attribute']['name']};

        if (is_null($value)) {
            return false;
        }

        return $this->valuesComparator->compare(
            $value,
            $condition['value'],
            $condition['operator'],
        );
    }

    protected function pageVisitAttributeMatches(array $condition): bool
    {
        return match ($condition['attribute']['name']) {
            'isReturningVisitor' => $this->getPageVisitsCount() > 1,
            'isFirstTimeVisitor' => !$this->getPageVisitsCount(),
            'timeOnCurrentPage' => $this->executor->user->latestPageVisit
                ? $this->valuesComparator->compare(
                    $this->executor->user->latestPageVisit->getDurationInSeconds(),
                    $condition['value'],
                    $condition['operator'],
                )
                : false,
            'timeOnAllPages' => $this->valuesComparator->compare(
                $this->getAllPageVisits()->sum(
                    fn($visit) => $visit->getDurationInSeconds(),
                ),
                $condition['value'],
                $condition['operator'],
            ),
            'currentPageUrl' => $this->valuesComparator->compare(
                $this->executor->user->latestPageVisit?->url,
                $condition['value'],
                $condition['operator'],
            ),
            'anyVisitedPageUrl' => $this->getAllPageVisits()->some(
                fn($visit) => $this->valuesComparator->compare(
                    $visit->url,
                    $condition['value'],
                    $condition['operator'],
                ),
            ),
            'numberOfViewedPages' => $this->valuesComparator->compare(
                $this->getAllPageVisits()->count(),
                $condition['value'],
                $condition['operator'],
            ),
            default => false,
        };
    }

    protected function getPageVisitsCount(): int
    {
        return $this->executor->user->loadCount('pageVisits')
            ->page_visits_count;
    }

    protected function getAllPageVisits(): Collection
    {
        if ($this->allPageVisits) {
            return $this->allPageVisits;
        }

        $this->allPageVisits = $this->executor->user
            ->pageVisits()
            ->limit(50)
            ->get();

        return $this->allPageVisits;
    }

    protected function getLatestUserSession(): UserSession|null
    {
        if ($this->latestUserSession) {
            return $this->latestUserSession;
        }

        $this->latestUserSession = $this->executor->user
            ->userSessions()
            ->orderBy('updated_at', 'desc')
            ->first();

        return $this->latestUserSession;
    }

    protected function getSignedUpDaysAgo(): int
    {
        $signedUp =
            $this->executor->user->customAttributes->first(
                fn($attribute) => $attribute['key'] === 'signed_up_at',
            )?->value ?? $this->executor->user->created_at;

        if (!$signedUp) {
            return 0;
        }

        try {
            return Carbon::parse($signedUp)->diffInDays(now());
        } catch (\Exception $e) {
            return 0;
        }
    }
}
