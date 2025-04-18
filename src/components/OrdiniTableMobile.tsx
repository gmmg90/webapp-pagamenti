import React, { useEffect, useState } from 'react';
import {
  List, ListItem, ListItemText, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Box, Fab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Autocomplete from '@mui/material/Autocomplete';

interface Ordine {
  id?: string;
  data: string;
  cliente: string;
  descrizione: string;
}

const oggi = () => new Date().toISOString().slice(0, 10);

const OrdiniTableMobile: React.FC = () => {
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [data, setData] = useState(oggi());
  const [cliente, setCliente] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [ordineToMove, setOrdineToMove] = useState<Ordine | null>(null);
  const [importoCliente, setImportoCliente] = useState<number>(0);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [ordineToDelete, setOrdineToDelete] = useState<Ordine | null>(null);
  const [clienti, setClienti] = useState<{ nome: string }[]>([]);

  useEffect(() => {
    const fetchOrdini = async () => {
      const querySnapshot = await getDocs(collection(db, 'ordini'));
      const ordiniData = querySnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as Ordine[];
      setOrdini(ordiniData);
    };
    fetchOrdini();
  }, []);

  useEffect(() => {
    const fetchClienti = async () => {
      const querySnapshot = await getDocs(collection(db, 'clienti'));
      const clientiData = querySnapshot.docs.map(docSnap => ({
        nome: docSnap.data().nome,
      }));
      setClienti(clientiData);
    };
    fetchClienti();
  }, []);

  // Raggruppa per cliente, tieni solo l'ultimo ordine per ogni cliente
  const ordiniUnici = Object.values(
    ordini.reduce((acc, ordine) => {
      if (
        !acc[ordine.cliente] ||
        new Date(ordine.data) > new Date(acc[ordine.cliente].data)
      ) {
        acc[ordine.cliente] = ordine;
      }
      return acc;
    }, {} as { [cliente: string]: Ordine })
  );

  const handleAdd = async () => {
    if (!cliente || !descrizione) return;
    const nuovoOrdine: Ordine = { data, cliente, descrizione };
    const docRef = await addDoc(collection(db, 'ordini'), nuovoOrdine);
    setOrdini([...ordini, { ...nuovoOrdine, id: docRef.id }]);
    setData(oggi());
    setCliente('');
    setDescrizione('');
    setOpenAdd(false);
  };

  const handleDeleteOrdine = (ordine: Ordine) => {
    setOrdineToDelete(ordine);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteOrdine = async () => {
    if (ordineToDelete) {
      setOrdini(ordini.filter(o => o.id !== ordineToDelete.id));
      setOrdineToDelete(null);
      setOpenDeleteDialog(false);
    }
  };

  const handleMoveToClienti = (ordine: Ordine) => {
    setOrdineToMove(ordine);
    setImportoCliente(0);
    setOpenDialog(true);
  };

  const confirmMoveToClienti = async () => {
    if (ordineToMove && importoCliente > 0) {
      await addDoc(collection(db, 'clienti'), {
        data: ordineToMove.data,
        nome: ordineToMove.cliente,
        descrizione: ordineToMove.descrizione,
        importo: importoCliente,
        acconti: [],
      });
      setOrdini(ordini.filter(o => o.id !== ordineToMove.id));
      setOrdineToMove(null);
      setOpenDialog(false);
    }
  };

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
        overflow: 'hidden',
      }}
    >
      <Typography variant="h5" sx={{ p: 2 }}>Ordini</Typography>
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          overflowY: 'auto',
          px: 0,
          width: '100%',
        }}
      >
        <List sx={{ width: '100%' }}>
          {ordiniUnici.map((o) => (
            <ListItem
              key={o.id}
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
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography fontWeight={600}>{o.cliente}</Typography>
                    <Typography variant="body2" color="text.secondary">{o.data}</Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" component="span">{o.descrizione}</Typography>
                }
              />
              <Box display="flex" gap={1} mt={1}>
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleMoveToClienti(o)}
                >
                  In Clienti
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteOrdine(o)}
                >
                  Elimina
                </Button>
              </Box>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Floating Action Button per aggiungere ordine */}
      {!openAdd && (
        <Fab
          color="primary"
          aria-label="Aggiungi"
          onClick={() => setOpenAdd(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialog aggiungi ordine */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
        <DialogTitle>Aggiungi Ordine</DialogTitle>
        <DialogContent>
          <TextField
            label="Data"
            type="date"
            fullWidth
            margin="dense"
            value={data}
            onChange={e => setData(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Autocomplete
            freeSolo
            options={[...new Set(clienti.map(c => c.nome))]}
            value={cliente}
            onInputChange={(_, newValue) => setCliente(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cliente"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Annulla</Button>
          <Button onClick={handleAdd} variant="contained">Aggiungi</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog sposta in clienti */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Sposta in Clienti</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Inserisci l'importo per il cliente <b>{ordineToMove?.cliente}</b>:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Importo"
            type="number"
            fullWidth
            value={importoCliente}
            onChange={e => setImportoCliente(Number(e.target.value))}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
          <Button onClick={confirmMoveToClienti} variant="contained" color="success">
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog elimina ordine */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare l'ordine di <b>{ordineToDelete?.cliente}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annulla</Button>
          <Button onClick={confirmDeleteOrdine} variant="contained" color="error">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrdiniTableMobile;