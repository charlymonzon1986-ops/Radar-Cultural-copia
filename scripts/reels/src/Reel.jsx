import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';

// Tipografía y colores tomados de la web de Radar Cultural
const { fontFamily: DISPLAY } = loadPlayfair('normal', { weights: ['700'] });
const { fontFamily: BODY } = loadDMSans('normal', { weights: ['400', '500', '700'] });

const AZUL = '#2A7FFF';
const VERDE = '#2ECC71';
const MORADO = '#9B59B6';
const IG = 'linear-gradient(90deg, #F09433, #E6683C, #DC2743, #CC2366, #BC1888)';

export const FPS = 30;
export const DURACION_FRAMES = FPS * 8;

export const Reel = ({ titulo, lugar, fecha, hora, imagen, credito }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({ frame, fps, config: { damping: 200 } });
  const subida = interpolate(entrada, [0, 1], [60, 0]);
  const opacidad = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const zoom = interpolate(frame, [0, DURACION_FRAMES], [1.0, 1.08]);

  return (
    <AbsoluteFill style={{ background: '#13171f', fontFamily: BODY, color: '#FFFFFF', overflow: 'hidden' }}>
      {/* Fondo: la misma imagen, desenfocada y oscurecida */}
      {imagen && (
        <AbsoluteFill>
          <Img src={imagen} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.45)', transform: 'scale(1.2)' }} />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ padding: '110px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: opacidad }}>
        {/* Marca */}
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, letterSpacing: 2, textAlign: 'center', color: '#FFFFFF' }}>
          RADAR CULTURAL
        </div>

        {/* Imagen principal */}
        <div style={{ transform: `translateY(${subida}px) scale(${zoom})`, borderRadius: 36, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', height: 880, width: '100%', background: '#000' }}>
          {imagen ? (
            <Img src={imagen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : null}
        </div>

        {/* Título y datos */}
        <div style={{ transform: `translateY(${subida}px)` }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 92, lineHeight: 1.05, marginBottom: 36 }}>
            {titulo}
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 40, fontWeight: 500 }}>
            <Pastilla color={AZUL} texto={fecha} />
            {hora ? <Pastilla color={VERDE} texto={hora} /> : null}
            <Pastilla color={MORADO} texto={lugar} />
          </div>
        </div>

        {/* Pie: llamada a la acción y crédito */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          <div style={{ background: AZUL, borderRadius: 999, padding: '26px 60px', fontSize: 42, fontWeight: 700 }}>
            Más eventos en el mapa
          </div>
          {credito ? (
            <div style={{ background: IG, borderRadius: 999, padding: '14px 36px', fontSize: 30, fontWeight: 500 }}>
              Foto: {credito}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Pastilla = ({ color, texto }) => (
  <div style={{ background: color, borderRadius: 999, padding: '14px 32px', whiteSpace: 'nowrap' }}>{texto}</div>
);
