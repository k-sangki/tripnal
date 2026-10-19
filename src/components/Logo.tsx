export function Logo({ dark = false, size }: { dark?: boolean; size?: number }) {
  return (
    <span className={`logo${dark ? " on-dark" : ""}`} style={size ? { fontSize: size } : undefined}>
      tripnal
      <i className="logo-dot" aria-hidden />
    </span>
  );
}
