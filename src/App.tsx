import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import LoginPage from './pages/LoginPage';
import { Box, Typography, CircularProgress, CssBaseline } from '@mui/material';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ClientiTable from './components/ClientiTable';
import OrdiniTable from './components/OrdiniTable';
import ClientiSaldoZeroTable from './components/ClientiSaldoZeroTable';
import useMediaQuery from '@mui/material/useMediaQuery';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import ClientiTableMobile from './components/ClientiTableMobile';
import OrdiniTableMobile from './components/OrdiniTableMobile';


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const isReallyMobile = useMediaQuery('(max-width:600px)');
  const [forceMobile, setForceMobile] = useState(false);
  const isMobile = forceMobile || isReallyMobile;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) setPage(0); // Vai sempre alla pagina Clienti dopo login
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          maxWidth: '100%', // usa la stessa maxWidth di ClientiTableMobile
          mx: 'auto',
          pt: 2,
          pb: 10,
          bgcolor: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch', // centra orizzontalmente
        }}
      >
        {user ? (
          <>
            {page === 0 && (
              <>
                <Typography variant="h4" gutterBottom>
                  Clienti
                </Typography>
                {isMobile ? <ClientiTableMobile /> : <ClientiTable />}
              </>
            )}
            {page === 1 && (
              <>
                <Typography variant="h4" gutterBottom>
                  Ordini
                </Typography>
                {isMobile ? <OrdiniTableMobile /> : <OrdiniTable />}
              </>
            )}
            {page === 2 && (
              <>
                <Typography variant="h4" gutterBottom>
                  Clienti Saldo Zero
                </Typography>
                <ClientiSaldoZeroTable />
              </>
            )}
          </>
        ) : (
          <LoginPage />
        )}
      </Box>
      {user && page !== -1 && (
        <BottomNavigation
          showLabels
          value={page}
          onChange={(_, newValue) => setPage(newValue)}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            borderTop: '1px solid #ddd',
            bgcolor: '#fff',
          }}
        >
          <BottomNavigationAction label="Clienti" icon={<PeopleIcon />} />
          <BottomNavigationAction label="Ordini" icon={<ReceiptIcon />} />
          <BottomNavigationAction label="Saldo Zero" icon={<PeopleIcon />} />
          <BottomNavigationAction
            label={isMobile ? "Mobile" : "Desktop"}
            icon={isMobile ? <SmartphoneIcon /> : <DesktopWindowsIcon />}
            onClick={() => {
              setForceMobile(f => !f);
              setPage(0); // Torna sempre alla pagina Clienti
            }}
          />
          <BottomNavigationAction
            label="Logout"
            icon={<AccountCircleIcon />}
            onClick={() => auth.signOut()}
          />
        </BottomNavigation>
      )}
    </>
  );
};

export default App;
