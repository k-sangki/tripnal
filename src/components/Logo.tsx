export function Logo({ dark = false, size }: { dark?: boolean; size?: number }) {
  return (
    <span className={`logo${dark ? " on-dark" : ""}`} style={size ? { fontSize: size } : undefined}>
      {/* trip + nalc(날씨)를 톤만 살짝 다르게. 점은 c 앞 위쪽에 두어 °C(온도)처럼 */}
      <span>
        trip
        <span className="logo-nalc">
          nal
          <i className="logo-dot" aria-hidden />c
        </span>
      </span>
    </span>
  );
}
