function Phone({ children, dark }) {
  return (
    <div style={{ width: 390, height: 844, borderRadius: 54, background: '#16181A', padding: 10, boxSizing: 'border-box', boxShadow: '0 30px 60px -20px rgba(0,0,0,.35)' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', background: dark ? '#16181A' : 'var(--bg-page)', display: 'flex', flexDirection: 'column', paddingTop: 50, boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 20, background: '#000', zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
}
window.Phone = Phone;
