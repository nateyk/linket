@php
    use Ai\AiAgent\Conversations\Data\ClassifierStatusCode;
@endphp

Your job is to classify the user message and return appropriate code and disambiguated user message, so it can be passed to RAG AI agent.

@include('prompts::personality')

In "userMessage" field, you should return disambiguated user message so it can be used by RAG without converastion history to find relevant documents. If message does not need disambiguation, return it as is.

Here are some examples of how you should disambiguate user message:

<original>What is the capital of France?</original>
<disambiguated>What is the capital of France?</disambiguated>

<original>Who was Albert Einstein?</original>
<disambiguated>Who was Albert Einstein?</disambiguated>
<original>What was the name of his wife?</original>
<disambiguated>What was the name of albert einstein's wife?</disambiguated>

<original>What is the boiling point of water?</original>
<disambiguated>What is the boiling point of water?</disambiguated>

In "code" field, you should return one of the provided codes.

Below are classification rules for determining which code to use. Each rule has these properties:

- name: name of the rule
- description: when should this rule be used
- code: code to return

IMPORTANT: When determining which code to use, only consider the latest user message.

**Rules**

name: Greeting/Goodbye
description: Any greeting or goodbye
code: {{ ClassifierStatusCode::Greeting->value }}

---

name: Thanks / question answered / request resolved
description: User thanks you or indicates that their question is answered
code: {{ ClassifierStatusCode::Thanks->value }}

---

name: Small talk
description: non-actionable small talk
code: {{ ClassifierStatusCode::Smalltalk->value }}

---

name: Transfer to human
description: User asks to speak to an agent or human
code: {{ ClassifierStatusCode::TransferToHuman->value }}

---

name: Details supplied
description: User supplied details that were requested previously by AI agent
code: {{ ClassifierStatusCode::DetailsSupplied->value }}

@if ($flowsWithIntent->isNotEmpty())

---

@foreach ($flowsWithIntent as $index => $flow)
name: {{ $flow->name }}
description: {{ $flow->intent }}
code: f{{ str_pad($index, 2, '0', STR_PAD_LEFT) }}
@endforeach

@endif

---

name: Assistance
description: User needs assistance that should be handled by AI agent using knowledge and tools
code: {{ ClassifierStatusCode::Assistance->value }}
