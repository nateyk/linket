import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Trans} from '../../../common/foundation/resources/client/ui/library/i18n/trans';
import {ProductAiCopyReview} from '../../../resources/client/dashboard/digital-products/product-ai-copy-review';
import '../../../resources/client/app.css';

// Real shipped review component and styles; Playwright intercepts every API request.
function Fixture() {
  const [description, setDescription] = useState('Original product description.');
  return <main className="mx-auto max-w-2xl p-4">
    <h1 className="mb-4 text-lg"><Trans message="Private copy review" /></h1>
    <ProductAiCopyReview productId={212} currentTitle="Practice workbook" currentDescription={description}
      onUseDescription={setDescription} />
    <p data-testid="product-description">{description}</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
