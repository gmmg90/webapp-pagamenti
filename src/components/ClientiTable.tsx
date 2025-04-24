import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Autocomplete
} from '@mui/material';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ToolbarFiltri from './ToolbarFiltri';
import type { CellHookData } from 'jspdf-autotable';

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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [yyyy, mm, dd] = dateStr.split('-');
  return `${dd}-${mm}-${yyyy}`;
}

const ClientiTable: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [data, setData] = useState(oggi());
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [importo, setImporto] = useState<string>(''); // stringa per evitare zeri davanti
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [searchCliente, setSearchCliente] = useState('');
  const [newAcconto, setNewAcconto] = useState<{ [key: string]: { importo: string; data: string } }>({});
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [mostraSaldoZero, setMostraSaldoZero] = useState(false);
  const [ordinaDecrescente, setOrdinaDecrescente] = useState(true);

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

  const nomiClienti = Array.from(new Set(clienti.map(c => c.nome)));
  const clientiFiltrati = clienti
    .filter(c => !c.deleted)
    .filter(c => {
      const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
      const saldo = c.importo - totaleAcconti;
      const matchNome = c.nome.toLowerCase().includes(searchCliente.toLowerCase());
      return matchNome && (mostraSaldoZero || saldo !== 0);
    })
    .sort((a, b) =>
      ordinaDecrescente
        ? new Date(b.data).getTime() - new Date(a.data).getTime()
        : new Date(a.data).getTime() - new Date(b.data).getTime()
    );

  // Calcolo totali
  const totaleImporti = clientiFiltrati.reduce((sum, c) => sum + (c.importo || 0), 0);
  const totaleSaldi = clientiFiltrati.reduce((sum, c) => {
    const totaleAcconti = (c.acconti || []).reduce((a, b) => a + (b.importo || 0), 0);
    return sum + (c.importo - totaleAcconti);
  }, 0);

  const handleAdd = async () => {
    const importoNum = parseFloat(importo.replace(',', '.') || '0');
    if (!nome || !descrizione || importoNum <= 0) return;
    const nuovoCliente: Cliente = { data, nome, descrizione, importo: importoNum, acconti: [] };
    const docRef = await addDoc(collection(db, 'clienti'), nuovoCliente);
    setClienti([...clienti, { ...nuovoCliente, id: docRef.id }]);
    setData(oggi());
    setNome('');
    setDescrizione('');
    setImporto('');
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
    const cliente = clientiFiltrati[index];
    setData(cliente.data || oggi());
    setNome(cliente.nome);
    setDescrizione(cliente.descrizione);
    setImporto(cliente.importo.toString());
  };

  const handleUpdate = async () => {
    if (editIndex === null) return;
    const importoNum = parseFloat(importo.replace(',', '.') || '0');
    const cliente = clientiFiltrati[editIndex];
    const updatedCliente = { ...cliente, data, nome, descrizione, importo: importoNum };
    await updateDoc(doc(db, 'clienti', cliente.id!), updatedCliente);
    setClienti(clienti.map(c => c.id === cliente.id ? updatedCliente : c));
    setEditIndex(null);
    setData(oggi());
    setNome('');
    setDescrizione('');
    setImporto('');
  };

  const handleAddAcconto = async (cliente: Cliente) => {
    const acconto = newAcconto[cliente.id!] || { importo: '', data: oggi() };
    if (!acconto.importo || !acconto.data) return;
    const importoNum = parseFloat(acconto.importo.replace(',', '.') || '0');
    if (importoNum <= 0) return;
    const updatedAcconti = [...(cliente.acconti || []), { importo: importoNum, data: acconto.data }];
    await updateDoc(doc(db, 'clienti', cliente.id!), { acconti: updatedAcconti });
    setClienti(clienti.map(c =>
      c.id === cliente.id ? { ...c, acconti: updatedAcconti } : c
    ));
    setNewAcconto({ ...newAcconto, [cliente.id!]: { importo: '', data: oggi() } });
  };

  const handleDeleteAcconto = async (cliente: Cliente, idx: number) => {
    const updatedAcconti = [...(cliente.acconti || [])];
    updatedAcconti.splice(idx, 1);
    await updateDoc(doc(db, 'clienti', cliente.id!), { acconti: updatedAcconti });
    setClienti(clienti.map(c =>
      c.id === cliente.id ? { ...c, acconti: updatedAcconti } : c
    ));
  };

  const handleDeleteCliente = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteCliente = async () => {
    if (clienteToDelete) {
      await updateDoc(doc(db, 'clienti', clienteToDelete.id!), { deleted: true });
      setClienti(clienti.filter(c => c.id !== clienteToDelete.id));
      setClienteToDelete(null);
      setOpenDeleteDialog(false);
    }
  };

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

    // Genera il body della tabella
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
      startY: 40, // Aumenta startY per fare spazio al testo del saldo
      head: [['Data', 'Nome', 'Descrizione', 'Importo', 'Acconti', 'Saldo']],
      body,
      theme: 'striped',
      headStyles: { fillColor: [25, 118, 210] },
      styles: { cellPadding: 2, fontSize: 10 }, // Stile normale per la tabella
      columnStyles: {
        4: { cellWidth: 40 }, // colonna acconti più larga se vuoi
      },
      didParseCell: function (data: CellHookData) {
        // Per andare a capo negli acconti
        if (data.column.index === 4 && typeof data.cell.raw === 'string') {
          data.cell.styles.cellPadding = { top: 2, right: 2, bottom: 2, left: 2 };
        }
      }
    });

    doc.save('report-clienti.pdf');
  };

  return (
    <>
      <ToolbarFiltri
        searchValue={searchCliente}
        onSearchChange={setSearchCliente}
        mostraSaldoZero={mostraSaldoZero}
        onToggleSaldoZero={setMostraSaldoZero}
        ordinaDecrescente={ordinaDecrescente}
        onToggleOrdina={() => setOrdinaDecrescente(v => !v)}
        onExportPDF={handleExportPDF}
        exportLabel="Esporta PDF"
        saldoZeroLabel="Saldo zero"
        ordinaLabel={["Più recenti prima", "Meno recenti prima"]}
      />
      <TableContainer
        component={Paper}
        sx={{
          maxWidth: 1800,
          margin: '40px auto',
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
            {/* Riga intestazioni sticky */}
            <TableRow
              sx={{
                position: 'sticky',
                top: 0,
                left: 0,
                right: 0,
                width: 'auto',
                background: '#e0e0e0',
                zIndex: 3,
              }}
            >
              <TableCell>Data</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Descrizione</TableCell>
              <TableCell>Importo</TableCell>
              <TableCell>Acconti</TableCell>
              <TableCell sx={{ width: 220 }}>Saldo</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Riga inserimento sticky */}
            <TableRow
              sx={{
                position: 'sticky',
                top: 56,
                left: 0,
                right: 0,
                width: 'auto',
                background: '#fff',
                zIndex: 2,
              }}
            >
              <TableCell sx={{ fontSize: 16, py: 2, background: '#fff' }}>
                <TextField
                  type="date"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  size="medium"
                  sx={{ minWidth: 130 }}
                  InputLabelProps={{ shrink: true }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: 16, py: 2, background: '#fff' }}>
                <Autocomplete
                  freeSolo
                  options={nomiClienti}
                  value={nome}
                  onInputChange={(_, newValue) => {
                    setNome(newValue);
                    setSearchCliente(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Cliente" size="medium" sx={{ minWidth: 180 }} />
                  )}
                />
              </TableCell>
              <TableCell sx={{ fontSize: 16, py: 2, background: '#fff' }}>
                <TextField value={descrizione} onChange={e => setDescrizione(e.target.value)} label="Descrizione" size="medium" sx={{ minWidth: 180 }} />
              </TableCell>
              <TableCell sx={{ fontSize: 16, py: 2, background: '#fff' }}>
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
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell sx={{ fontSize: 16, py: 2 }}>
                <Button
                  onClick={editIndex === null ? handleAdd : handleUpdate}
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  {editIndex === null ? 'Aggiungi' : 'Aggiorna'}
                </Button>
              </TableCell>
            </TableRow>
            {/* Righe clienti */}
            {clientiFiltrati.map((c, i) => {
              const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + a.importo, 0);
              const saldo = c.importo - totaleAcconti;
              return (
                <React.Fragment key={c.id || i}>
                  <TableRow>
                    <TableCell sx={{ fontSize: 16, py: 2 }}>{formatDate(c.data || oggi())}</TableCell>
                    <TableCell sx={{ fontSize: 16, py: 2 }}>{c.nome}</TableCell>
                    <TableCell sx={{ fontSize: 16, py: 2 }}>{c.descrizione}</TableCell>
                    <TableCell sx={{ fontSize: 16, py: 2 }}>{c.importo.toFixed(2)} €</TableCell>
                    <TableCell sx={{ fontSize: 16, py: 2 }}>
                      {/* Lista acconti */}
                      {(c.acconti || []).map((a, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                          {a.importo.toFixed(2)} € - {formatDate(a.data)}
                          <Button
                            size="small"
                            color="error"
                            sx={{ minWidth: 0, ml: 1 }}
                            onClick={() => handleDeleteAcconto(c, idx)}
                          >
                            <DeleteIcon fontSize="small" />
                          </Button>
                        </div>
                      ))}
                      {/* Form aggiunta acconto */}
                      <div style={{ marginTop: 8 }}>
                        <TextField
                          type="text"
                          label="Nuovo acconto"
                          size="small"
                          value={newAcconto[c.id!]?.importo || ''}
                          onChange={e => {
                            const val = e.target.value.replace(',', '.');
                            if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                              setNewAcconto({
                                ...newAcconto,
                                [c.id!]: {
                                  ...newAcconto[c.id!],
                                  importo: val,
                                  data: newAcconto[c.id!]?.data || oggi(),
                                },
                              });
                            }
                          }}
                          sx={{ width: 120, mr: 1 }}
                          inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' }}
                        />
                        <TextField
                          type="date"
                          size="small"
                          value={newAcconto[c.id!]?.data || oggi()}
                          onChange={e =>
                            setNewAcconto({
                              ...newAcconto,
                              [c.id!]: {
                                ...newAcconto[c.id!],
                                data: e.target.value,
                                importo: newAcconto[c.id!]?.importo || '',
                              },
                            })
                          }
                          sx={{ width: 140, mr: 1 }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleAddAcconto(c)}
                        >
                          Aggiungi
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell sx={{ fontSize: 16, py: 2, width: 180 }}>
                      {saldo.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(i)}
                        sx={{ mr: 1 }}
                      >
                        Modifica
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteCliente(c)}
                        startIcon={<DeleteIcon />}
                      >
                        Elimina
                      </Button>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            <TableRow>
              <TableCell colSpan={3} sx={{ fontWeight: 'bold', fontSize: 18 }}>
                Totali
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: 18 }}>
                {totaleImporti.toFixed(2)} €
              </TableCell>
              <TableCell />
              <TableCell sx={{ fontWeight: 'bold', fontSize: 18 }}>
                {totaleSaldi.toFixed(2)} €
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler eliminare la riga <b>{clienteToDelete?.nome}</b>?<br />
            Questa operazione non può essere annullata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Annulla
          </Button>
          <Button onClick={confirmDeleteCliente} color="error" variant="contained">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClientiTable;