import { Composition } from 'remotion';
import { Reel, DURACION_FRAMES, FPS } from './Reel.jsx';

export const RemotionRoot = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={DURACION_FRAMES}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{
      titulo: 'Título del evento',
      lugar: 'Lugar',
      fecha: '19 sep 2026',
      hora: '19:00',
      imagen: '',
      credito: ''
    }}
  />
);
