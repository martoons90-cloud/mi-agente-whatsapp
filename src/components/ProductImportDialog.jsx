// src/components/ProductImportDialog.jsx
import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx'; // <-- ¡NUEVO! Importamos la librería para leer Excel
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
  Typography, CircularProgress, Alert, Link, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function ProductImportDialog({ open, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        id: '123 (dejar en blanco para productos nuevos)', // <-- ¡CAMBIO CLAVE!
        name: 'Martillo de Goma',
        category: 'Herramientas de Mano',
        description: 'Ideal para trabajos delicados que no dejen marca',
        price: '5000',
        stock: '10',
        unit: 'unidad'
      }
    ];
    // ¡CAMBIO CLAVE! Generamos un archivo Excel para la plantilla
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    XLSX.writeFile(workbook, "plantilla_productos.xlsx");
  };

  const handleFileChange = (event) => {
    setError('');
    const selectedFile = event.target.files[0];
    // ¡CAMBIO! Aceptamos CSV y los dos tipos comunes de Excel
    const acceptedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

    if (selectedFile && acceptedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
    } else {
      setError('Por favor, selecciona un archivo .csv válido.');
      setFile(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('No se ha seleccionado ningún archivo.');
      return;
    }
    setLoading(true);

    const processData = (data) => {
      // Validamos que los datos tengan las columnas esperadas
      if (!data || data.length === 0) {
        setError('El archivo está vacío o no tiene un formato válido.');
        setLoading(false);
        return;
      }
      const requiredColumns = ['name', 'price']; // Hacemos solo 'name' y 'price' obligatorios.
      const headers = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        setError(`El archivo no es válido. Faltan las columnas: ${missingColumns.join(', ')}`);
        setLoading(false);
        return;
      }

      onImport(data);
      setLoading(false);
      onClose();
    };

    // ¡LÓGICA INTELIGENTE! Leemos el archivo según su tipo
    if (file.type === 'text/csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processData(results.data),
        error: (err) => {
          setError(`Error al procesar el archivo CSV: ${err.message}`);
          setLoading(false);
        }
      });
    } else { // Si es un archivo de Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          processData(jsonData);
        } catch (err) {
          setError(`Error al procesar el archivo Excel: ${err.message}`);
          setLoading(false);
        }
      };
      reader.onerror = (err) => setError(`Error al leer el archivo: ${err.message}`);
      reader.readAsArrayBuffer(file);
    }
  };

  // Al cerrar, reseteamos el estado
  const handleClose = () => {
    setFile(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Importar Productos</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Sube un archivo **CSV o Excel (.xlsx)**. Columnas requeridas: <strong>name, price</strong>. Opcionales: <strong>id, category, description, stock, unit</strong>.
            <br />
            <Link component="button" variant="body2" onClick={handleDownloadTemplate}>Descargar plantilla de ejemplo</Link>
          </Typography>
        </Alert>
        <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
          Seleccionar Archivo
          <input type="file" hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
        </Button>
        {file && <Typography sx={{ mt: 1, fontStyle: 'italic' }}>Archivo seleccionado: {file.name}</Typography>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleImport} variant="contained" color="secondary" disabled={!file || loading}>
          {loading ? <CircularProgress size={24} /> : 'Importar y Reemplazar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductImportDialog;
