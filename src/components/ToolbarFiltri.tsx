import { Box, TextField, FormControlLabel, Switch, Button } from '@mui/material';

interface ToolbarFiltriProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  mostraSaldoZero?: boolean;
  onToggleSaldoZero?: (v: boolean) => void;
  ordinaDecrescente: boolean;
  onToggleOrdina: () => void;
  onExportPDF: () => void;
  exportLabel?: string;
  saldoZeroLabel?: string;
  ordinaLabel?: [string, string];
}

const ToolbarFiltri: React.FC<ToolbarFiltriProps> = ({
  searchValue,
  onSearchChange,
  mostraSaldoZero,
  onToggleSaldoZero,
  ordinaDecrescente,
  onToggleOrdina,
  onExportPDF,
  exportLabel = "Esporta PDF",
  saldoZeroLabel = "Saldo zero",
  ordinaLabel = ["Più recenti prima", "Meno recenti prima"],
}) => (
  <Box
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      p: 2,
      bgcolor: '#e3f2fd',
      borderRadius: 2,
      mb: 2,
    }}
  >
    <TextField
      label="Cerca"
      value={searchValue}
      onChange={e => onSearchChange(e.target.value)}
      size="small"
      sx={{ minWidth: 180 }}
    />
    {typeof mostraSaldoZero === 'boolean' && onToggleSaldoZero && (
      <FormControlLabel
        control={
          <Switch
            checked={mostraSaldoZero}
            onChange={e => onToggleSaldoZero(e.target.checked)}
            color="primary"
          />
        }
        label={saldoZeroLabel}
      />
    )}
    <FormControlLabel
      control={
        <Switch
          checked={ordinaDecrescente}
          onChange={onToggleOrdina}
          color="primary"
        />
      }
      label={ordinaDecrescente ? ordinaLabel[0] : ordinaLabel[1]}
    />
    <Button
      variant="contained"
      color="secondary"
      onClick={onExportPDF}
      sx={{ ml: 'auto' }}
    >
      {exportLabel}
    </Button>
  </Box>
);

export default ToolbarFiltri;