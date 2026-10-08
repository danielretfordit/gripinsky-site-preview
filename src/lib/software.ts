export const SOFTWARE_NAMES: Record<string, string> = {
  '3DS MAX': '3ds Max', 'CORONA RENDERER': 'Corona', 'V-RAY': 'V-Ray', 'FOREST PACK': 'Forest Pack', 'RAILCLONE': 'RailClone',
  'ADOBE PHOTOSHOP': 'Photoshop', 'BLENDER': 'Blender', 'ZBRUSH': 'ZBrush', 'UNREAL ENGINE': 'Unreal Engine', 'MAYA': 'Maya',
  'SUBSTANCE PAINTER': 'Substance Painter', 'SUBSTANCE DESIGNER': 'Substance Designer', 'MARVELOUS DESIGNER': 'Marvelous Designer',
  'KEYSHOT': 'KeyShot', 'MARMOSET': 'Marmoset', 'RIZOM UV': 'RizomUV', 'SPEEDTREE': 'SpeedTree',
  'CITYSCAPE PRO': 'CityScape PRO', 'STABLE DIFFUSION': 'Stable Diffusion',
};
export const softwareName = (name: string) => SOFTWARE_NAMES[name] ?? name;
