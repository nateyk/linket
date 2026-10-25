<?php

namespace Ai\AiAgent\Flows\Nodes;

enum NodeType: string
{
    case Message = 'message';
    case Buttons = 'buttons';
    case DynamicButtons = 'dynamicButtons';
    case Transfer = 'transfer';
    case CloseConversation = 'closeConversation';
    case GoToStep = 'goToStep';
    case GoToFlow = 'goToFlow';
    case CollectDetails = 'collectDetails';
    case Tool = 'tool';
    case SetAttribute = 'setAttribute';
    case AddTags = 'addTags';
    case Articles = 'articles';
    case Cards = 'cards';
    case DynamicCards = 'dynamicCards';
    case Branches = 'branches';

    public function getNode()
    {
        return match ($this) {
            self::Message => MessageNode::class,
            self::Buttons => ButtonsNode::class,
            self::DynamicButtons => DynamicButtonsNode::class,
            self::Transfer => TransferNode::class,
            self::CloseConversation => CloseConversationNode::class,
            self::GoToStep => GoToStepNode::class,
            self::GoToFlow => GoToFlowNode::class,
            self::CollectDetails => CollectDetailsNode::class,
            self::Tool => UseToolNode::class,
            self::SetAttribute => SetAttributeNode::class,
            self::AddTags => AddTagsNode::class,
            self::Articles => ArticlesNode::class,
            self::Cards => CardsNode::class,
            self::DynamicCards => DynamicCardsNode::class,
            self::Branches => BranchesNode::class,
        };
    }
}
