import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Typography,
  Box,
  InputAdornment,
  CircularProgress,
  Autocomplete,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { supabase } from '../supabaseClient';
import { MercadoLibreService } from '../services/mercadoLibre';

const initialFormState = {
  make: '',
  model: '',
  year: new Date().getFullYear(),
  price: '',
  currency: 'USD',
  mileage: 0,
  transmission: 'Automática',
  fuel_type: 'Nafta',
  doors: 4,
  description: '',
  payment_plan: '',
  status: 'Disponible',
  photos: ['', '', '', '', ''], // 5 slots fixed for simplicity
  body_type: 'sedan' // internal helper for guide images
};

const VehicleForm = ({ open, onClose, onSave, vehicleToEdit }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  // Market Data State
  const [apiMakes, setApiMakes] = useState([]);
  const [apiModels, setApiModels] = useState([]);
  const [apiYears, setApiYears] = useState([]); // [NEW] Years list
  const [apiVersions, setApiVersions] = useState([]);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState(''); // [NEW] Year selection

  const [modelsLoading, setModelsLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false); // [NEW]
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, online, offline

  useEffect(() => {
    if (vehicleToEdit) {
      setFormData({
        ...vehicleToEdit,
        photos: vehicleToEdit.photos && vehicleToEdit.photos.length === 5
          ? vehicleToEdit.photos
          : [...(vehicleToEdit.photos || []), ...Array(5 - (vehicleToEdit.photos || []).length).fill('')]
      });
    } else {
      setFormData(initialFormState);
    }
  }, [vehicleToEdit, open]);

  // Load Brands on mount
  useEffect(() => {
    if (open) {
      setConnectionStatus('checking');
      MercadoLibreService.getBrands().then(data => {
        setApiMakes(data);
        if (data._source && data._source.startsWith('api')) {
          setConnectionStatus('online');
        } else {
          setConnectionStatus('offline');
        }
      });
    }
  }, [open]);

  // Load Models when Make changes
  useEffect(() => {
    if (selectedMake) {
      setModelsLoading(true);
      MercadoLibreService.getModels(selectedMake)
        .then(data => {
          setApiModels(data);
          setModelsLoading(false);
        })
        .catch(() => setModelsLoading(false));
    } else {
      setApiModels([]);
    }
  }, [selectedMake]);

  // [NEW] Load Years when Model changes
  useEffect(() => {
    if (selectedMake && selectedModel) {
      setYearsLoading(true);
      // We assume service has getYears or we simulate it
      // Using generic years first if service doesn't support it yet
      // MercadoLibreService.getYears(selectedMake, selectedModel)

      // Let's implement a quick list of years or call service if available
      // For now, let's hardcode a range or try to fetch if we update service
      const years = Array.from({ length: 30 }, (_, i) => ({ id: `${2025 - i}`, name: `${2025 - i}` }));
      setApiYears(years);
      setYearsLoading(false);

      // Also fetch Body Type estimate
      MercadoLibreService.getBodyType(selectedMake, selectedModel).then(type => {
        setFormData(prev => ({ ...prev, body_type: type }));
      });

    } else {
      setApiYears([]);
    }
  }, [selectedMake, selectedModel]);

  // Load Versions when Year changes
  useEffect(() => {
    if (selectedMake && selectedModel && selectedYear) {
      setVersionsLoading(true);
      MercadoLibreService.getVersions(selectedMake, selectedModel, selectedYear)
        .then(data => {
          setApiVersions(data);
          setVersionsLoading(false);
        })
        .catch(() => setVersionsLoading(false));
    } else {
      setApiVersions([]);
    }
  }, [selectedMake, selectedModel, selectedYear]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (event, index) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('vehicle-photos')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(filePath);

      setFormData(prev => {
        const newPhotos = [...prev.photos];
        newPhotos[index] = publicUrl;
        return {
          ...prev,
          photos: newPhotos
        };
      });

    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.map((p, i) => i === indexToRemove ? '' : p)
    }));
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.make) newErrors.make = 'La marca es obligatoria';
    // if (!formData.model) newErrors.model = 'El modelo es obligatorio'; // Can be optional if user manually types
    if (!formData.price) newErrors.price = 'El precio es obligatorio';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { body_type, ...cleanFormData } = formData;
    const dataToSave = {
      ...cleanFormData,
      year: parseInt(formData.year, 10) || 2024,
      price: parseFloat(formData.price) || 0,
      mileage: parseInt(formData.mileage || 0, 10),
      doors: parseInt(formData.doors || 4, 10),
      photos: formData.photos.filter(p => p !== '') // clean up empty slots
    };

    onSave(dataToSave);
    onClose();
  };

  // Guide Images Source based on Body Type
  // Assuming assets are in public/assets/guides/
  const guideImages = {
    front: formData.body_type === 'pickup' ? '/assets/guides/pickup_front.png' : '/assets/guides/sedan_front.png',
    side: formData.body_type === 'pickup' ? '/assets/guides/pickup_side.png' : '/assets/guides/sedan_side.png',
    rear: formData.body_type === 'pickup' ? '/assets/guides/pickup_rear.png' : '/assets/guides/sedan_rear.png',
    interior: '/assets/guides/sedan_dashboard.png', // Generic for now
    other: '/assets/guides/sedan_front_seats.png'
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {vehicleToEdit ? 'Editar Vehículo' : 'Nuevo Vehículo'}
        {connectionStatus !== 'checking' && (
          <Chip
            label={connectionStatus === 'online' ? 'MercadoLibre' : 'Modo Respaldo'}
            color={connectionStatus === 'online' ? 'success' : 'warning'}
            variant="outlined"
            size="small"
            icon={connectionStatus === 'online' ? <span style={{ fontSize: 16 }}>🟢</span> : <span style={{ fontSize: 16 }}>🟠</span>}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Buscador Inteligente (Marca, Modelo, Año, Versión)
            </Typography>
          </Grid>

          {/* 1. MAKE */}
          <Grid item xs={12} sm={3}>
            <Autocomplete
              options={apiMakes}
              getOptionLabel={(option) => option.name || ''}
              value={apiMakes.find(m => m.id === selectedMake) || null}
              onChange={(event, newValue) => {
                setSelectedMake(newValue ? newValue.id : '');
                setFormData(prev => ({ ...prev, make: newValue ? newValue.name : '' }));
                setSelectedModel('');
                setSelectedYear(''); // Reset downstream
                setApiModels([]);
                setApiYears([]);
                setApiVersions([]);
              }}
              renderInput={(params) => <TextField {...params} label="1. Marca" placeholder="Ej. Volkswagen" />}
            />
          </Grid>

          {/* 2. MODEL */}
          <Grid item xs={12} sm={3}>
            <Autocomplete
              options={apiModels}
              getOptionLabel={(option) => option.name || ''}
              loading={modelsLoading}
              value={apiModels.find(m => m.id === selectedModel) || null}
              onChange={(event, newValue) => {
                setSelectedModel(newValue ? newValue.id : '');
                setFormData(prev => ({ ...prev, model: newValue ? newValue.name : '' }));
                setSelectedYear('');
                setApiYears([]);
                setApiVersions([]);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="2. Modelo"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {modelsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* 3. YEAR */}
          <Grid item xs={12} sm={2}>
            <Autocomplete
              options={apiYears}
              getOptionLabel={(option) => option.name || ''}
              loading={yearsLoading}
              value={apiYears.find(y => y.id === selectedYear) || null}
              onChange={(event, newValue) => {
                setSelectedYear(newValue ? newValue.id : '');
                setFormData(prev => ({ ...prev, year: newValue ? newValue.name : '' }));
                setApiVersions([]);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="3. Año"
                  placeholder="2023"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {yearsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* 4. VERSION */}
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={apiVersions}
              getOptionLabel={(option) => option.name || 'Base'}
              loading={versionsLoading}
              onInputChange={(event, newInputValue) => {
                // Allow user to type free text if version not found
                if (!apiVersions.some(v => v.name === newInputValue)) {
                  // We could update model text, but better to keep version separate or append
                }
              }}
              onChange={(event, newValue) => {
                if (newValue) {
                  // Append version to model name or keep separate field?
                  // Providing "Make Model Version" string for simplicity in current schema
                  setFormData(prev => ({
                    ...prev,
                    model: `${formData.model} ${newValue.name}`.trim(),
                  }));
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="4. Versión"
                  placeholder="Selecciona versión..."
                  helperText={!selectedYear ? "Selecciona año primero" : "Versiones detalladas"}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {versionsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* SEPARATOR */}
          <Grid item xs={12}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 1 }} />
            <Typography variant="caption" color="text.secondary">Datos Manuales (se autocompletan arriba)</Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Marca"
              name="make"
              value={formData.make}
              onChange={handleChange}
              error={!!errors.make}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Modelo Completo"
              name="model"
              value={formData.model}
              onChange={handleChange}
              helperText="Incluye la versión"
              error={!!errors.model}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth
              label="Año"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth
              label="Puertas"
              name="doors"
              type="number"
              value={formData.doors}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={6} sm={4}>
            <TextField
              fullWidth
              label="Precio"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              error={!!errors.price}
              InputProps={{
                startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              select
              fullWidth
              label="Moneda"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="ARS">ARS</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Kilometraje"
              name="mileage"
              type="number"
              value={formData.mileage}
              onChange={handleChange}
              InputProps={{
                endAdornment: <InputAdornment position="end">km</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              select
              fullWidth
              label="Transmisión"
              name="transmission"
              value={formData.transmission}
              onChange={handleChange}
            >
              <MenuItem value="Manual">Manual</MenuItem>
              <MenuItem value="Automática">Automática</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción Adicional"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Fotos y Guía de Toma</Typography>
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', py: 1 }}>
              {formData.photos.map((photoUrl, index) => (
                <Box key={index} sx={{ position: 'relative', width: 120, height: 120, flexShrink: 0, border: '1px dashed grey', borderRadius: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
                  {/* Guide Overlay if empty */}
                  {!photoUrl && (
                    <img
                      src={
                        index === 0 ? guideImages.front :
                          index === 1 ? guideImages.side :
                            index === 2 ? guideImages.rear :
                              index === 3 ? guideImages.interior :
                                guideImages.other
                      }
                      alt="Guide"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.3, objectFit: 'contain', pointerEvents: 'none' }}
                    />
                  )}

                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt={`Foto ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                      <IconButton
                        size="small"
                        onClick={() => handleRemovePhoto(index)}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'error.light' } }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton component="label" disabled={uploading}>
                      <CloudUploadIcon />
                      <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, index)} />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Plan de Financiación (Opcional)"
              name="payment_plan"
              value={formData.payment_plan}
              onChange={handleChange}
              placeholder="Ej: Anticipo 50% y 12 cuotas fijas..."
            />
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={uploading}>
          {vehicleToEdit ? 'Guardar Cambios' : 'Crear Vehículo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VehicleForm;
