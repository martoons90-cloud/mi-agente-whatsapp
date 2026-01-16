// src/components/PaymentMethodForm.jsx
 import { useState, useEffect } from 'react';
 import {
   Button, Dialog, DialogActions, DialogContent, DialogTitle, Box,
   TextField, Stack, Typography
 } from '@mui/material';
 import PaymentIcon from '@mui/icons-material/Payment';
 
 function PaymentMethodForm({ open, onClose, onSave, methodToEdit }) {
   const [name, setName] = useState('');
   const [surcharge, setSurcharge] = useState('');
   const [validUntil, setValidUntil] = useState(''); // <-- NUEVO
 
   useEffect(() => {
     if (methodToEdit) {
       setName(methodToEdit.name);
       setSurcharge(methodToEdit.surcharge_percentage);
       setValidUntil(methodToEdit.valid_until || ''); // <-- NUEVO
     } else {
       // Limpiar para un nuevo método
       setName('');
       setSurcharge('');
       setValidUntil(''); // <-- NUEVO
     }
   }, [methodToEdit, open]);
 
   const handleSave = () => {
     if (!name) {
       alert('El nombre es obligatorio.');
       return;
     }
 
     const paymentMethodData = {
       id: methodToEdit?.id, // Incluir id si estamos editando
       name,
       surcharge_percentage: parseFloat(surcharge) || 0,
       valid_until: validUntil || null, // <-- NUEVO
     };
 
     onSave(paymentMethodData);
     handleClose();
   };
 
   const handleClose = () => {
     onClose();
   };
 
   return (
     <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
       <DialogTitle>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
           <PaymentIcon color="primary" />
           <Typography variant="h6" component="div">
             {methodToEdit ? 'Editar' : 'Agregar'} Método de Pago
           </Typography>
         </Box>
       </DialogTitle>
       <DialogContent>
         <Stack spacing={2} sx={{ pt: 1 }}>
           <TextField
             autoFocus
             label="Nombre del Método de Pago"
             type="text"
             fullWidth
             variant="outlined"
             value={name}
             onChange={(e) => setName(e.target.value)}
             required
           />
           <TextField
             label="Porcentaje de Recargo (%)"
             type="number"
             fullWidth
             variant="outlined"
             value={surcharge}
             onChange={(e) => setSurcharge(e.target.value)}
           />
           <TextField
             label="Válido Hasta (Opcional)"
             name="valid_until"
             type="date"
             fullWidth
             variant="outlined"
             value={validUntil}
             onChange={(e) => setValidUntil(e.target.value)}
             InputLabelProps={{ shrink: true }}
           />
         </Stack>
       </DialogContent>
       <DialogActions>
         <Button onClick={handleClose} color="inherit">Cancelar</Button>
         <Button onClick={handleSave} variant="contained" color="secondary">Guardar</Button>
       </DialogActions>
     </Dialog>
   );
 }
 
 export default PaymentMethodForm;