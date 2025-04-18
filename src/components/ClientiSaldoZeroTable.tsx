import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

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

const ClientiSaldoZeroTable: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);

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

  const clientiSaldoZero = clienti.filter(c => {
    const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
    return c.importo - totaleAcconti === 0;
  });

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
            <TableCell>Importo</TableCell>
            <TableCell>Acconti</TableCell> {/* nuova colonna */}
            <TableCell>Saldo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clientiSaldoZero.map((c, i) => {
            const totaleAcconti = (c.acconti || []).reduce((sum, a) => sum + (a.importo || 0), 0);
            const saldo = c.importo - totaleAcconti;
            return (
              <TableRow key={c.id || i}>
                <TableCell>{c.data}</TableCell>
                <TableCell>{c.nome}</TableCell>
                <TableCell>{c.descrizione}</TableCell>
                <TableCell>{c.importo.toFixed(2)} €</TableCell>
                <TableCell>
                  {(c.acconti || []).length === 0
                    ? '-'
                    : c.acconti.map((a, idx) => (
                        <div key={idx}>
                          {a.importo.toFixed(2)} € - {a.data}
                        </div>
                      ))}
                </TableCell>
                <TableCell>{saldo.toFixed(2)} €</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ClientiSaldoZeroTable;