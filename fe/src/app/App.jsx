import AppProviders from './providers/AppProviders.jsx';
import AppRouter from './router.jsx';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
