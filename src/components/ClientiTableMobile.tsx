import React, { useEffect, useState } from 'react';
import {
  List, ListItem, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Fab from '@mui/material/Fab';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  deleted?: boolean;
}

const oggi = () => new Date().toISOString().slice(0, 10);

const formatDate = (date: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(date).toLocaleDateString('it-IT', options);
};

const ClientiTableMobile: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [importo, setImporto] = useState<string>(''); // invece di 0
  const [mostraSaldoZero, setMostraSaldoZero] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');
  const [ordinaDecrescente, setOrdinaDecrescente] = useState(false); // Cambia da true a false

  // Acconto
  const [openAcconto, setOpenAcconto] = useState(false);
  const [accontoImporto, setAccontoImporto] = useState<string>(''); // invece di 0
  const [accontoData, setAccontoData] = useState(oggi());
  const [clienteAcconto, setClienteAcconto] = useState<Cliente | null>(null);

  // Modifica Cliente
  const [openEdit, setOpenEdit] = useState(false);
  const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDescrizione, setEditDescrizione] = useState('');
  const [editImporto, setEditImporto] = useState<string>('');

  // Elimina Cliente
  const [openDelete, setOpenDelete] = useState(false);

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
    if (!nome || !descrizione || Number(importo) <= 0) return;
    const nuovoCliente: Cliente = {
      data: oggi(),
      nome,
      descrizione,
      importo: parseFloat(importo || '0'),
      acconti: [],
    };
    const docRef = await addDoc(collection(db, 'clienti'), nuovoCliente);
    setClienti([...clienti, { ...nuovoCliente, id: docRef.id }]);
    setNome('');
    setDescrizione('');
    setImporto('');
    setOpenAdd(false);
  };

  const handleAddAcconto = async () => {
    if (!clienteAcconto || Number(accontoImporto) <= 0) return;
    const updatedAcconti = [
      ...(clienteAcconto.acconti || []),
      { importo: parseFloat(accontoImporto || '0'), data: accontoData },
    ];
    await updateDoc(doc(db, 'clienti', clienteAcconto.id!), { acconti: updatedAcconti });
    setClienti(clienti.map(c =>
      c.id === clienteAcconto.id ? { ...c, acconti: updatedAcconti } : c
    ));
    setImporto('');
    setAccontoImporto('');
    setAccontoData(oggi());
    setClienteAcconto(null);
    setOpenAcconto(false);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setClienteEdit(cliente);
    setEditNome(cliente.nome);
    setEditDescrizione(cliente.descrizione);
    setEditImporto(cliente.importo.toString());
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!clienteEdit || !editNome || !editDescrizione || Number(editImporto) <= 0) return;
    await updateDoc(doc(db, 'clienti', clienteEdit.id!), {
      nome: editNome,
      descrizione: editDescrizione,
      importo: parseFloat(editImporto || '0'),
    });
    setClienti(clienti.map(c =>
      c.id === clienteEdit.id
        ? { ...c, nome: editNome, descrizione: editDescrizione, importo: parseFloat(editImporto || '0') }
        : c
    ));
    setOpenEdit(false);
    setClienteEdit(null);
  };

  const handleDeleteCliente = async () => {
    if (!clienteEdit) return;
    await updateDoc(doc(db, 'clienti', clienteEdit.id!), { deleted: true });
    setClienti(clienti.filter(c => c.id !== clienteEdit.id));
    setOpenDelete(false);
    setOpenEdit(false);
    setClienteEdit(null);
  };

  const clientiFiltrati = clienti
    .filter(c => !c.deleted)
    .filter(c => {
      const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
      const saldo = c.importo - totaleAcconti;
      return (mostraSaldoZero || saldo !== 0) && c.nome.toLowerCase().includes(searchCliente.toLowerCase());
    })
    .sort((a, b) =>
      ordinaDecrescente
        ? new Date(b.data).getTime() - new Date(a.data).getTime()
        : new Date(a.data).getTime() - new Date(b.data).getTime()
    );

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // 1. Intestazione principale (centrata)
    const companyName = 'Gelarredi Informatica srl';
    doc.setFontSize(18);
    const pageWidth = doc.internal.pageSize.getWidth();
    const companyNameWidth = doc.getTextWidth(companyName);
    const companyNameX = (pageWidth - companyNameWidth) / 2;
    doc.text(companyName, companyNameX, 18);

    // Titolo dinamico
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal'); // Assicura stile normale
    let startX = 14; // Manteniamo startX per il titolo e il saldo che sono allineati a sinistra
    if (clientiFiltrati.length > 0) {
      const firstClientName = clientiFiltrati[0].nome;
      const allSameClient = clientiFiltrati.every(c => c.nome === firstClientName);
      if (allSameClient) {
        // 2a. Scrivi etichetta titolo (normale)
        const label = 'Report Cliente: ';
        doc.text(label, startX, 28);
        startX += doc.getTextWidth(label); // Calcola dove iniziare il nome

        // 2b. Scrivi nome cliente (grassetto corsivo)
        doc.setFont('helvetica', 'bolditalic');
        doc.text(firstClientName, startX, 28);
        doc.setFont('helvetica', 'normal'); // Reimposta normale
        startX = 14; // Resetta startX per la riga del saldo
      } else {
        // Titolo generico (normale)
        doc.text('Report Clienti', startX, 28);
      }
    } else {
      // Titolo generico se non ci sono clienti filtrati (normale)
      doc.text('Report Clienti', startX, 28);
    }

    // Calcolo totale saldo
    const totaleSaldi = clientiFiltrati.reduce((sum, c) => {
      const totaleAcconti = (c.acconti || []).reduce((a, b) => a + (b.importo || 0), 0);
      return sum + (c.importo - totaleAcconti);
    }, 0);

    // Saldo Totale (allineato a sinistra)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal'); // Assicura stile normale
    startX = 14; // Usa startX per allineare a sinistra
    // 3a. Scrivi etichetta saldo (normale)
    const saldoLabel = 'Differnza a Saldo: ';
    doc.text(saldoLabel, startX, 34);
    startX += doc.getTextWidth(saldoLabel); // Calcola dove iniziare il valore

    // 3b. Scrivi valore saldo (grassetto corsivo)
    doc.setFont('helvetica', 'bolditalic');
    doc.text(`${totaleSaldi.toFixed(2)} €`, startX, 34);
    doc.setFont('helvetica', 'normal'); // Reimposta normale prima della tabella

    // ... resto del codice per generare il body e autoTable ...
    const body = clientiFiltrati.map(c => {
      const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
      const saldo = c.importo - totaleAcconti;
      const accontiString = (c.acconti || [])
        .map(a => `${a.importo.toFixed(2)} € (${formatDate(a.data)})`)
        .join('\n');
      return [
        formatDate(c.data),
        c.nome,
        c.descrizione,
        c.importo.toFixed(2) + ' €',
        accontiString,
        saldo.toFixed(2) + ' €'
      ];
    });

    doc.autoTable({
      startY: 40,
      head: [['Data', 'Nome', 'Descrizione', 'Importo', 'Acconti', 'Saldo']],
      body,
      theme: 'striped',
      headStyles: { fillColor: [25, 118, 210] },
      styles: { cellPadding: 2, fontSize: 10 }, // Stile normale per la tabella
      columnStyles: {
        4: { cellWidth: 40 },
      },
    });

    doc.save('report-clienti.pdf');
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
        overflow: 'hidden', // evita doppio scroll
      }}
    >
      <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #eee' }}> {/* Aggiunto bordo separatore */}
        <Typography variant="h5" sx={{ mb: 1, textAlign: 'center' }}>Clienti</Typography> {/* Centrato titolo */}
        <TextField
          label="Cerca cliente"
          fullWidth
          variant="outlined" // Stile più moderno
          size="small" // Più compatto
          value={searchCliente}
          onChange={e => setSearchCliente(e.target.value)}
          sx={{ mb: 2 }}
        />
        {/* Riga Controlli */}
        <Box
          display="flex"
          justifyContent="space-between" // Spazio tra gruppo switches e pulsante PDF
          alignItems="flex-start" // Allinea in alto per coerenza se vanno a capo
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 2 }}
        >
          {/* Gruppo Switches a sinistra */}
          <Box display="flex" flexDirection="column" alignItems="flex-start">
            {/* Switch Saldo Zero */}
            <FormControlLabel
              control={
                <Switch
                  checked={mostraSaldoZero}
                  onChange={e => setMostraSaldoZero(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={<Typography variant="caption">Mostra saldo zero</Typography>}
              sx={{ m: 0, p: 0, height: '24px' }} // Riduci margini/padding e altezza fissa
            />
            {/* Switch Ordinamento (come FormControlLabel) */}
            <FormControlLabel
              control={
                <Switch
                  checked={ordinaDecrescente}
                  onChange={() => setOrdinaDecrescente(v => !v)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="caption">
                  {ordinaDecrescente ? "Recenti prima" : "Meno recenti prima"}
                </Typography>
              }
              labelPlacement="end" // Assicura che l'etichetta sia a destra
              sx={{ m: 0, p: 0, mt: 0.5 }} // Riduci margini/padding, aggiungi piccolo spazio sopra
            />
          </Box>

          {/* Pulsante Esporta a destra */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
            sx={{ mt: 1 }} // Aggiungi un po' di margine sopra se va a capo
          >
            PDF
          </Button>
        </Box>
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
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                    onClick={() => handleOpenEdit(c)}
                  >
                    Modifica
                  </Button>
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
            type="text"
            fullWidth
            margin="dense"
            value={importo}
            onChange={e => {
              const val = e.target.value.replace(',', '.');
              if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                setImporto(val);
              }
            }}
            inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' }}
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
            type="text"
            fullWidth
            margin="dense"
            value={accontoImporto}
            onChange={e => {
              const val = e.target.value.replace(',', '.');
              if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                setAccontoImporto(val);
              }
            }}
            inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' }}
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

      {/* Dialog modifica cliente */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <DialogTitle>Modifica Cliente</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            margin="dense"
            value={editNome}
            onChange={e => setEditNome(e.target.value)}
          />
          <TextField
            label="Descrizione"
            fullWidth
            margin="dense"
            value={editDescrizione}
            onChange={e => setEditDescrizione(e.target.value)}
          />
          <TextField
            label="Importo"
            type="text"
            fullWidth
            margin="dense"
            value={editImporto}
            onChange={e => {
              const val = e.target.value.replace(',', '.');
              if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                setEditImporto(val);
              }
            }}
            inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Annulla</Button>
          <Button color="error" onClick={() => setOpenDelete(true)}>
            Elimina
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>Sei sicuro di voler eliminare questo cliente?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={handleDeleteCliente}>
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientiTableMobile;