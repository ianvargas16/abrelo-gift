import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { defaultGift } from './config/defaultGift';
import { RecipientRuntimeApp } from './runtime/RecipientRuntimeApp';
import { loadRuntimeGift, type RuntimeBootstrapResult } from './runtime/runtimeBootstrap';
import './fonts.css';
import './styles/base.css';
import './styles/runtime.css';

const productionBootstrap = loadRuntimeGift(document);
const bootstrap: RuntimeBootstrapResult = import.meta.env.DEV
  && productionBootstrap.status === 'error'
  && productionBootstrap.reason === 'missing'
  ? { status: 'ready', gift: defaultGift }
  : productionBootstrap;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecipientRuntimeApp bootstrap={bootstrap} />
  </StrictMode>,
);
