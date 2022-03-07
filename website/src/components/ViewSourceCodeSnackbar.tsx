import React from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const ViewSourceCodeSnackbar = ({ link }: { link: string }) => {
  const [open, setOpen] = React.useState(true);
  const handleClose = () => {
    setOpen(false);
  };
  const handleGo = () => {
    window.open(link, '_blank');
    setOpen(false);
  };

  const action = (
    <>
      <Button onClick={handleGo}>Go</Button>
      <IconButton onClick={handleClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </>
  );

  return (
    <div>
      <Snackbar
        open={open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={handleClose}
        message="View this page's source code"
        action={action}
      />
    </div>
  );
};
export default ViewSourceCodeSnackbar;
