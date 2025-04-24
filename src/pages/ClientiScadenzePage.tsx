import React, { useState, useEffect } from 'react';
import {
  Box, Tabs, Tab, Typography, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, InputLabel, Select, FormControl, CircularProgress, List, ListItem, ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

type Scadenza = {
  id: string;
  cliente: string;
  tipo: 'noleggio' | 'contratto' | 'software';
  dataInizio: string;
  periodicita: string;
};

const softwareList = [
  "PRIMO",
  "SECONDO",
  "TERZO",
  "QUARTO",
  "QUINTO"
];

const moduliAggiuntiviPerSoftware: Record<string, string[]> = {
  "PRIMO": ["Modulo A", "Modulo B", "Modulo C"],
  "SECONDO": ["Modulo X", "Modulo Y"],
  // aggiungi altri software/moduli se necessario
};

function ScadenzeTab({ scadenze }: { scadenze: Scadenza[] }) {
  if (scadenze.length === 0) return <Typography>Nessuna scadenza trovata.</Typography>;
  return (
    <List>
      {scadenze.map(s => (
        <ListItem key={s.id}>
          <ListItemText
            primary={`${s.cliente} (${s.tipo})`}
            secondary={`Inizio: ${s.dataInizio} - Periodicità: ${s.periodicita}`}
          />
        </ListItem>
      ))}
    </List>
  );
}

const ClientiScadenzePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);

  // Stato form
  const [cliente, setCliente] = useState('');
  const [tipo, setTipo] = useState('');
  const [dataInizio, setDataInizio] = useState('');
  const [periodicita, setPeriodicita] = useState('');
  const [tipoNoleggio, setTipoNoleggio] = useState('');
  const [descrizioneNoleggio, setDescrizioneNoleggio] = useState('');
  const [matricolaContratto, setMatricolaContratto] = useState('');
  const [software, setSoftware] = useState('');
  const [moduliAggiuntivi, setModuliAggiuntivi] = useState<string[]>([]);

  // Stato clienti e scadenze
  const [clienti, setClienti] = useState<string[]>([]);
  const [loadingClienti, setLoadingClienti] = useState(true);
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [loadingScadenze, setLoadingScadenze] = useState(true);

  // Carica clienti
  useEffect(() => {
    const fetchClienti = async () => {
      setLoadingClienti(true);
      const clientiSnapshot = await getDocs(collection(db, 'clienti'));
      // Rendi i nomi univoci usando un Set
      const nomiUnici = Array.from(new Set(clientiSnapshot.docs.map(doc => doc.data().nome as string)));
      setClienti(nomiUnici);
      setLoadingClienti(false);
    };
    fetchClienti();
  }, []);

  // Carica scadenze
  useEffect(() => {
    const fetchScadenze = async () => {
      setLoadingScadenze(true);
      const scadenzeSnapshot = await getDocs(query(collection(db, 'scadenze'), orderBy('dataInizio')));
      setScadenze(scadenzeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Scadenza)));
      setLoadingScadenze(false);
    };
    fetchScadenze();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Se il cliente non esiste, salvalo
    if (cliente && !clienti.includes(cliente)) {
      await addDoc(collection(db, 'clienti'), { nome: cliente });
      setClienti(prev => [...prev, cliente]);
    }

    // Prepara i dati aggiuntivi in base al tipo
    let dettagli: any = {};
    if (tipo === 'noleggio') {
      dettagli = {
        tipoNoleggio,
        descrizioneNoleggio
      };
    } else if (tipo === 'contratto') {
      dettagli = {
        matricolaContratto
      };
    } else if (tipo === 'software') {
      dettagli = {
        software,
        moduliAggiuntivi
      };
    }

    // Salva la scadenza
    const docRef = await addDoc(collection(db, 'scadenze'), {
      cliente,
      tipo,
      dataInizio,
      periodicita,
      ...dettagli,
      createdAt: new Date()
    });

    // Aggiorna lista scadenze in tempo reale (opzionale: puoi anche ricaricare da DB)
    setScadenze(prev => [
      ...prev,
      {
        id: docRef.id,
        cliente,
        tipo: tipo as Scadenza['tipo'],
        dataInizio,
        periodicita,
        ...dettagli
      }
    ]);

    // Reset form e chiudi dialog
    setCliente('');
    setTipo('');
    setDataInizio('');
    setPeriodicita('');
    setTipoNoleggio('');
    setDescrizioneNoleggio('');
    setMatricolaContratto('');
    setSoftware('');
    setModuliAggiuntivi([]);
    handleClose();
  };

  // Filtra scadenze per tab
  const scadenzeNoleggi = scadenze.filter(s => s.tipo === 'noleggio');
  const scadenzeContratti = scadenze.filter(s => s.tipo === 'contratto');
  const scadenzeSoftware = scadenze.filter(s => s.tipo === 'software');

  return (
    <Box position="relative">
      <Typography variant="h4" gutterBottom>
        Gestione Scadenze Clienti
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Noleggi" />
        <Tab label="Contratti" />
        <Tab label="Software" />
      </Tabs>
      <Box mt={2}>
        {loadingScadenze ? (
          <CircularProgress />
        ) : (
          <>
            {tab === 0 && <ScadenzeTab scadenze={scadenzeNoleggi} />}
            {tab === 1 && <ScadenzeTab scadenze={scadenzeContratti} />}
            {tab === 2 && <ScadenzeTab scadenze={scadenzeSoftware} />}
          </>
        )}
      </Box>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Aggiungi Scadenza"
        onClick={handleOpen}
        sx={{ position: 'fixed', bottom: 80, right: 24, zIndex: 100 }}
      >
        <AddIcon />
      </Fab>
      {/* Dialog inserimento scadenza */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Nuova Scadenza</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            {loadingClienti ? (
              <CircularProgress />
            ) : (
              <TextField
                label="Cliente"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                select
                required
                SelectProps={{
                  native: false,
                  renderValue: (selected) => typeof selected === 'string' && selected.length > 0 ? selected : 'Seleziona o inserisci cliente',
                }}
              >
                {clienti.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
                {cliente && !clienti.includes(cliente) && (
                  <MenuItem value={cliente}>{`Aggiungi "${cliente}"`}</MenuItem>
                )}
              </TextField>
            )}
            <FormControl required>
              <InputLabel id="tipo-label">Tipo Scadenza</InputLabel>
              <Select
                labelId="tipo-label"
                value={tipo}
                label="Tipo Scadenza"
                onChange={e => setTipo(e.target.value)}
              >
                <MenuItem value="noleggio">Noleggio</MenuItem>
                <MenuItem value="contratto">Contratto</MenuItem>
                <MenuItem value="software">Software</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Data Inizio"
              type="date"
              value={dataInizio}
              onChange={e => setDataInizio(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
            <FormControl required>
              <InputLabel id="periodicita-label">Periodicità</InputLabel>
              <Select
                labelId="periodicita-label"
                value={periodicita}
                label="Periodicità"
                onChange={e => setPeriodicita(e.target.value)}
              >
                <MenuItem value="mensile">Mensile</MenuItem>
                <MenuItem value="annuale">Annuale</MenuItem>
              </Select>
            </FormControl>
            {tipo === 'noleggio' && (
              <>
                <FormControl required>
                  <InputLabel id="tipo-noleggio-label">Tipo Noleggio</InputLabel>
                  <Select
                    labelId="tipo-noleggio-label"
                    value={tipoNoleggio}
                    label="Tipo Noleggio"
                    onChange={e => setTipoNoleggio(e.target.value)}
                  >
                    <MenuItem value="RT">RT</MenuItem>
                    <MenuItem value="Fotocopiatore">Fotocopiatore</MenuItem>
                    <MenuItem value="Altro">Altro</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Descrizione"
                  value={descrizioneNoleggio}
                  onChange={e => setDescrizioneNoleggio(e.target.value)}
                  required
                />
              </>
            )}
            {tipo === 'contratto' && (
              <TextField
                label="Matricola"
                value={matricolaContratto}
                onChange={e => setMatricolaContratto(e.target.value)}
                required
              />
            )}
            {tipo === 'software' && (
              <>
                <FormControl required>
                  <InputLabel id="software-label">Software</InputLabel>
                  <Select
                    labelId="software-label"
                    value={software}
                    label="Software"
                    onChange={e => {
                      setSoftware(e.target.value);
                      setModuliAggiuntivi([]); // reset moduli quando cambi software
                    }}
                  >
                    {softwareList.map(sw => (
                      <MenuItem key={sw} value={sw}>{sw}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* Moduli aggiuntivi solo se previsti per il software selezionato */}
                {software && moduliAggiuntiviPerSoftware[software] && (
                  <FormGroup>
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>Moduli aggiuntivi</Typography>
                    {moduliAggiuntiviPerSoftware[software].map(modulo => (
                      <FormControlLabel
                        key={modulo}
                        control={
                          <Checkbox
                            checked={moduliAggiuntivi.includes(modulo)}
                            onChange={e => {
                              if (e.target.checked) {
                                setModuliAggiuntivi(prev => [...prev, modulo]);
                              } else {
                                setModuliAggiuntivi(prev => prev.filter(m => m !== modulo));
                              }
                            }}
                          />
                        }
                        label={modulo}
                      />
                    ))}
                  </FormGroup>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annulla</Button>
            <Button type="submit" variant="contained">Salva</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ClientiScadenzePage;