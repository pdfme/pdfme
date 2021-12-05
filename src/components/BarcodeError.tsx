const BarcodeError = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    }}
  >
    <p
      style={{
        color: 'white',
        background: 'red',
        padding: '0.25rem',
        fontSize: '12pt',
        fontWeight: 'bold',
        borderRadius: 3,
      }}
    >
      ERROR
    </p>
  </div>
);

export default BarcodeError;
