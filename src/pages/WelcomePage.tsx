import { Box, Typography, Button } from '@mui/material';

const WelcomePage: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 2,
    }}
  >
    <Typography variant="h3" color="primary" gutterBottom>
      Benvenuto!
    </Typography>
    <Typography variant="h6" color="text.secondary" align="center">
      Sei entrato nell'applicazione pagamenti.<br />
      Usa il menu in basso per navigare tra le sezioni.
    </Typography>
    <Button variant="contained" color="primary" onClick={onStart}>
      Vai ai Clienti
    </Button>
  </Box>
);

export default WelcomePage;