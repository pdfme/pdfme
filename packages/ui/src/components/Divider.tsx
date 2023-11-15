import React from 'react';

const Divider = ({ mini }: { mini?: boolean }) => (
  <div style={{ marginTop: mini ? '0.25rem' : '0.5rem', marginBottom: mini ? '0.25rem' : '0.5rem', borderBottom: '1px solid #e5e5e5' }} />
);

export default Divider;
