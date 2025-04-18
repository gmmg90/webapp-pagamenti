import React, { useEffect, useState } from 'react';
import {
  List, ListItem, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Fab from '@mui/material/Fab';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';

interface Acconto {
  importo: number;
  data: string;
}
interface Cliente {
  id?: string;
  data: string;
  nome: string;
  descrizione: string;
  importo: number;
  acconti: Acconto[];
}

const oggi = () => new Date().toISOString().slice(0, 10);

const ClientiTableMobile: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [importo, setImporto] = useState<number>(0);
  const [mostraSaldoZero, setMostraSaldoZero] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');

  // Acconto
  const [openAcconto, setOpenAcconto] = useState(false);
  const [accontoImporto, setAccontoImporto] = useState<number>(0);
  const [accontoData, setAccontoData] = useState(oggi());
  const [clienteAcconto, setClienteAcconto] = useState<Cliente | null>(null);

  useEffect(() => {
    const fetchClienti = async () => {
      const querySnapshot = await getDocs(collection(db, 'clienti'));
      const clientiData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          acconti: Array.isArray(data.acconti) ? data.acconti : [],
        };
      }) as Cliente[];
      setClienti(clientiData);
    };
    fetchClienti();
  }, []);

  const handleAddCliente = async () => {
    if (!nome || !descrizione || importo <= 0) return;
    const nuovoCliente: Cliente = {
      data: oggi(),
      nome,
      descrizione,
      importo,
      acconti: [],
    };
    const docRef = await addDoc(collection(db, 'clienti'), nuovoCliente);
    setClienti([...clienti, { ...nuovoCliente, id: docRef.id }]);
    setNome('');
    setDescrizione('');
    setImporto(0);
    setOpenAdd(false);
  };

  const handleAddAcconto = async () => {
    if (!clienteAcconto || accontoImporto <= 0) return;
    const updatedAcconti = [
      ...(clienteAcconto.acconti || []),
      { importo: accontoImporto, data: accontoData },
    ];
    await updateDoc(doc(db, 'clienti', clienteAcconto.id!), { acconti: updatedAcconti });
    setClienti(clienti.map(c =>
      c.id === clienteAcconto.id ? { ...c, acconti: updatedAcconti } : c
    ));
    setAccontoImporto(0);
    setAccontoData(oggi());
    setClienteAcconto(null);
    setOpenAcconto(false);
  };

  const clientiFiltrati = clienti.filter(c => {
    const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
    const saldo = c.importo - totaleAcconti;
    return (mostraSaldoZero || saldo !== 0) && c.nome.toLowerCase().includes(searchCliente.toLowerCase());
  });

  return (
    <Box
      sx={{
        width: '100vw',
        maxWidth: 480,
        mx: 'auto',
        bgcolor: '#fafafa',
        minHeight: '100vh',
        p: 0,
        position: 'relative',
        overflow: 'hidden', // evita doppio scroll
      }}
    >
      <Box sx={{ p: 2, pb: 0 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Clienti</Typography>
        <TextField
          label="Cerca cliente"
          fullWidth
          margin="dense"
          value={searchCliente}
          onChange={e => setSearchCliente(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={mostraSaldoZero}
              onChange={e => setMostraSaldoZero(e.target.checked)}
              color="primary"
            />
          }
          label="Mostra clienti con saldo zero"
        />
      </Box>
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          overflowY: 'auto',
          px: 0, // nessun padding laterale
          width: '100%', // aggiungi questa riga!
        }}
      >
        <List sx={{ width: '100%' }}>
          {clientiFiltrati.map((c) => {
            const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
            const saldo = c.importo - totaleAcconti;
            return (
              <ListItem
                key={c.id}
                sx={{
                  bgcolor: '#fff',
                  mb: 1,
                  borderRadius: 2,
                  boxShadow: 1,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                  px: 1,
                }}
              >
                <Box display="flex" width="100%" alignItems="center" justifyContent="flex-start">
                  <IconButton
                    color="primary"
                    onClick={() => { setClienteAcconto(c); setOpenAcconto(true); }}
                    sx={{ mr: 1 }}
                  >
                    <AccountBalanceWalletIcon />
                  </IconButton>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={600}>{c.nome}</Typography>
                        <Typography variant="body2" color="text.secondary">{c.data}</Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">{c.descrizione}</Typography>
                        <br />
                        <Typography variant="body2" color="primary" component="span">
                          Importo: {c.importo.toFixed(2)} € &nbsp;|&nbsp; Saldo: {saldo.toFixed(2)} €
                        </Typography>
                      </>
                    }
                  />
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {!openAdd && (
        <Fab
          color="primary"
          aria-label="Aggiungi"
          onClick={() => setOpenAdd(true)}
          sx={{
            position: 'fixed',
            bottom: 80, // alza il FAB sopra la bottom bar
            right: 24,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialog aggiungi cliente */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
        <DialogTitle>Aggiungi Cliente</DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            options={[...new Set(clienti.map(c => c.nome))]}
            value={nome}
            onInputChange={(_, newValue) => setNome(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Nome"
                fullWidth
                margin="dense"
              />
            )}
          />
          <TextField
            label="Descrizione"
            fullWidth
            margin="dense"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
          />
          <TextField
            label="Importo"
            type="number"
            fullWidth
            margin="dense"
            value={importo}
            onChange={e => setImporto(Number(e.target.value))}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Annulla</Button>
          <Button onClick={handleAddCliente} variant="contained">Aggiungi</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog aggiungi acconto */}
      <Dialog open={openAcconto} onClose={() => setOpenAcconto(false)}>
        <DialogTitle>Aggiungi Acconto</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Cliente: <b>{clienteAcconto?.nome}</b>
          </Typography>
          <TextField
            label="Importo"
            type="number"
            fullWidth
            margin="dense"
            value={accontoImporto}
            onChange={e => setAccontoImporto(Number(e.target.value))}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            label="Data"
            type="date"
            fullWidth
            margin="dense"
            value={accontoData}
            onChange={e => setAccontoData(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAcconto(false)}>Annulla</Button>
          <Button onClick={handleAddAcconto} variant="contained">Aggiungi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientiTableMobile;