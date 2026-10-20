export function Logo({ dark = false, size }: { dark?: boolean; size?: number }) {
  return (
    <span className={`logo${dark ? " on-dark" : ""}`} style={size ? { fontSize: size } : undefined}>
      {/* trip + nalc(날씨)를 톤만 살짝 다르게 */}
      <span>
        trip<span className="logo-nalc">nalc</span>
      </span>
      <i className="logo-dot" aria-hidden />
    </span>
  );
}
