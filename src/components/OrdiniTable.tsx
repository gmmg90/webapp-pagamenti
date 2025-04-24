import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Autocomplete
} from '@mui/material';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';

interface Ordine {
  id?: string;
  data: string;
  cliente: string;
  descrizione: string;
  deleted?: boolean;
}

interface Cliente {
  id?: string;
  nome: string;
}

const oggi = () => new Date().toISOString().slice(0, 10);

const OrdiniTable: React.FC = () => {
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [data, setData] = useState(oggi());
  const [cliente, setCliente] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [ordineToMove, setOrdineToMove] = useState<Ordine | null>(null);
  const [importoCliente, setImportoCliente] = useState<number>(0);
  const [descrizioneCliente, setDescrizioneCliente] = useState<string>('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [ordineToDelete, setOrdineToDelete] = useState<Ordine | null>(null);

  // Carica clienti una sola volta
  useEffect(() => {
    const fetchClienti = async () => {
      const querySnapshot = await getDocs(collection(db, 'clienti'));
      const clientiData = querySnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as Cliente[];
      setClienti(clientiData);
    };
    fetchClienti();
  }, []);

  // Carica ordini
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

  // Prendi i nomi clienti dalla collezione clienti
  const nomiClienti = Array.from(new Set(clienti.map(c => c.nome)));

  const ordiniFiltrati = ordini
    .filter(o => !o.deleted) // nasconde gli ordini eliminati
    .filter(o =>
      o.cliente.toLowerCase().includes(searchCliente.toLowerCase())
    );

  // Raggruppa per cliente, tieni solo l'ultimo ordine per ogni cliente
  const ordiniUnici = Object.values(
    ordiniFiltrati.reduce((acc, ordine) => {
      // Se vuoi l'ultimo ordine, confronta la data
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
  };

  const handleDeleteOrdine = (ordine: Ordine) => {
    setOrdineToDelete(ordine);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteOrdine = async () => {
    if (ordineToDelete) {
      await updateDoc(doc(db, 'ordini', ordineToDelete.id!), { deleted: true });
      setOrdini(ordini.filter(o => o.id !== ordineToDelete.id));
      setOrdineToDelete(null);
      setOpenDeleteDialog(false);
    }
  };

  const handleMoveToClienti = (ordine: Ordine) => {
    setOrdineToMove(ordine);
    setImportoCliente(0);
    setDescrizioneCliente(ordine.descrizione); // Precompila con la descrizione attuale
    setOpenDialog(true);
  };

  const confirmMoveToClienti = async () => {
    if (ordineToMove && importoCliente > 0) {
      await addDoc(collection(db, 'clienti'), {
        data: ordineToMove.data,
        nome: ordineToMove.cliente,
        descrizione: descrizioneCliente, // Usa la descrizione modificata
        importo: importoCliente,
        acconti: [],
      });
      // Elimina l'ordine anche dal database
      if (ordineToMove.id) {
        await deleteDoc(doc(db, 'ordini', ordineToMove.id));
      }
      setOrdini(ordini.filter(o => o.id !== ordineToMove.id));
      setOrdineToMove(null);
      setOpenDialog(false);
      setDescrizioneCliente('');
    }
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        maxWidth: 1100,
        margin: '40px auto',
        p: 3,
        boxShadow: 6,
        borderRadius: 3,
        bgcolor: '#fafafa',
        overflowX: 'auto',
        maxHeight: 700,
        overflowY: 'auto',
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Descrizione</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Riga inserimento */}
          <TableRow>
            <TableCell>
              <TextField
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                size="medium"
                sx={{ minWidth: 130 }}
                InputLabelProps={{ shrink: true }}
              />
            </TableCell>
            <TableCell>
              <Autocomplete
                freeSolo
                options={nomiClienti}
                value={cliente}
                onInputChange={(_, newValue) => {
                  setCliente(newValue);
                  setSearchCliente(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Cliente" size="medium" sx={{ minWidth: 180 }} />
                )}
              />
            </TableCell>
            <TableCell>
              <TextField
                value={descrizione}
                onChange={e => setDescrizione(e.target.value)}
                label="Descrizione"
                size="medium"
                sx={{ minWidth: 180 }}
              />
            </TableCell>
            <TableCell>
              <Button
                onClick={handleAdd}
                variant="contained"
                color="primary"
                size="large"
              >
                Aggiungi
              </Button>
            </TableCell>
          </TableRow>
          {/* Righe ordini */}
          {ordiniUnici.map((o, i) => (
            <TableRow key={o.id || i}>
              <TableCell>{o.data}</TableCell>
              <TableCell>{o.cliente}</TableCell>
              <TableCell>{o.descrizione}</TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleMoveToClienti(o)}
                  sx={{ mr: 1 }}
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Sposta in Clienti</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Inserisci l'importo per il cliente <b>{ordineToMove?.cliente}</b>:
          </DialogContentText>
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
          <TextField
            margin="dense"
            label="Descrizione"
            fullWidth
            value={descrizioneCliente}
            onChange={e => setDescrizioneCliente(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
          <Button onClick={confirmMoveToClienti} variant="contained" color="success">
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler eliminare l'ordine di <b>{ordineToDelete?.cliente}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annulla</Button>
          <Button onClick={confirmDeleteOrdine} variant="contained" color="error">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
};

export default OrdiniTable;