import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import Swal from 'sweetalert2';
 


// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  buttons: THREE.Mesh[];
  knobs: THREE.Mesh[];
  teclas: THREE.Mesh[];
  faders: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  buttons: Record<string, string>;
  knobs: Record<string, string>;
  teclas: Record<string, string>;
  faders: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  buttons: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
  teclas: Record<string, PaletteColor>;
  faders: Record<string, PaletteColor>;
}

const Beato16Configurator: React.FC = () => {

  // Estado del modal de configuración eliminado (flujo por email)

  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null); // OrbitControls no tiene tipado oficial en three.js
  const modelRef = useRef<THREE.Group | null>(null);
  const modelOriginalPositionRef = useRef<THREE.Vector3 | null>(null);

  // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'buttons' | 'knobs' | 'teclas' | 'faders'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('beato16_chosenColors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved colors:', e);
      }
    }
    return {
      type: 'configUpdate',
      chasis: 'Gris',
      buttons: {},
      knobs: {},
      teclas: {},
      faders: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], buttons: [], knobs: [], teclas: [], faders: [] });

  // Ref para guardar el estado anterior de currentView
  const prevViewRef = useRef<'normal' | 'chasis' | 'buttons' | 'knobs' | 'teclas' | 'faders'>(currentView);

  // Estado para selección múltiple de botones
  const [selectedButtons, setSelectedButtons] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de knobs
  const [selectedKnobs, setSelectedKnobs] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de teclas
  const [selectedTeclas, setSelectedTeclas] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de faders
  const [selectedFaders, setSelectedFaders] = useState<THREE.Mesh[]>([]);

  // Configuración de paletas
  const PALETTES: Palettes = {
    chasis: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    buttons: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    knobs: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    teclas: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    faders: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, }
  };

  const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1, -0.1), target: new THREE.Vector3(0, -0.5, -0.1) },
    top: { pos: new THREE.Vector3(1, 1.95, -0.3), target: new THREE.Vector3(-0.35, -1.2, -0.3) },
  };

  // Guardar posición y target iniciales de la cámara
  const initialCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraTargetRef = useRef<THREE.Vector3 | null>(null);

  // ==================================================================
  // INICIO DE LA CORRECCIÓN DE SEGURIDAD
  // ==================================================================
<<<<<<< HEAD
  // Capturar screenshot del canvas
  const getScreenshot = useCallback(() => {
    if (!rendererRef.current) return null;
    try {
      return rendererRef.current.domElement.toDataURL('image/png');
    } catch (e) {
      console.error('No se pudo capturar el screenshot:', e);
      return null;
    }
  }, []);

  // Modal de resumen (SweetAlert) con captura del modal completo y listas en dos columnas
  const handleFinalizeOpenModal = useCallback(async () => {
    const shot = getScreenshot();

    // Helpers: translate Spanish color names and normalize item names
    const spanishToEnglish: Record<string, string> = {
      'Verde': 'Green',
      'Amarillo': 'Yellow',
      'Azul': 'Blue',
      'Blanco': 'White',
      'Naranja': 'Orange',
      'Morado': 'Purple',
      'Rojo': 'Red',
      'Negro': 'Black',
      'Rosa': 'Pink',
      'Gris': 'Gray'
    };
    const toEnglish = (name: string) => spanishToEnglish[name] || name;
    const normalizeName = (name: string) => name
      .replace(/Boton/gi, 'Button')
      .replace(/tecla/gi, 'Key')
      .replace(/fader/gi, 'Fader')
      .replace(/_\d+\b/i, '');

    const toList = (pairs: [string, string][], empty: string) =>
      pairs.length
        ? pairs.map(([n, c]) => `<li style=\"margin:4px 0\"><strong>${normalizeName(n)}</strong>: ${toEnglish(c)}</li>`).join('')
        : `<li>${empty}</li>`;

    const html = `
      <div style=\"display:flex; flex-direction:column; gap:12px; text-align:left;\">
        <div style=\"display:flex; gap:16px; align-items:flex-start;\">
          ${shot ? `<img src=\"${shot}\" alt=\"Screenshot\" style=\"width:240px; height:auto; border-radius:8px; border:1px solid #4b5563\"/>` : '<div style=\"width:240px;height:160px;display:flex;align-items:center;justify-content:center;border:1px solid #4b5563;border-radius:8px;\">No screenshot</div>'}
          <div style=\"flex:1\">
            <p style=\"margin:0 0 4px 0\"><strong>Chassis:</strong> ${toEnglish(chosenColors.chasis)}</p>
            <div style=\"display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start;\">
              <div>
                <p style=\"margin:0 0 6px 0; color:#FCD34D;\"><strong>Buttons:</strong></p>
                <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${toList(Object.entries(chosenColors.buttons || {}), 'Default')}</ul>
              </div>
              <div>
                <div style=\"display:flex; flex-direction:column; gap:10px;\">
                  <div>
                    <p style=\"margin:0 0 6px 0; color:#FCD34D;\"><strong>Knobs:</strong></p>
                    <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${toList(Object.entries(chosenColors.knobs || {}), 'Default')}</ul>
                  </div>
                  <div>
                    <p style=\"margin:0 0 6px 0; color:#FCD34D;\"><strong>Keys:</strong></p>
                    <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${toList(Object.entries(chosenColors.teclas || {}), 'Default')}</ul>
                  </div>
                  <div>
                    <p style=\"margin:0 0 6px 0; color:#FCD34D;\"><strong>Faders:</strong></p>
                    <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${toList(Object.entries(chosenColors.faders || {}), 'Default')}</ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const result = await Swal.fire({
      title: 'Configuration Summary',
      html,
      width: 900,
      background: '#0b1220',
      color: '#e5e7eb',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Send by email',
      denyButtonText: 'Download image',
      cancelButtonText: 'Close',
      focusConfirm: false,
      allowOutsideClick: false,
      preDeny: async () => {
        try {
          const popup = (Swal as any).getPopup?.() as HTMLElement | null;
          if (!popup) return;
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'beato16-configuration-summary.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.error('No se pudo capturar el modal:', e);
        }
      }
    });

    if (result.isConfirmed) {
      const emailDestino = 'your-business-email@example.com';
      const asunto = 'Beato16 Configuration';
      const colorSummary = `\nHello,\n\nHere is my configuration for the Beato16:\n\n- Chassis: ${toEnglish(chosenColors.chasis)}\n- Buttons: ${Object.entries(chosenColors.buttons).map(([k,v])=>`${normalizeName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n- Knobs: ${Object.entries(chosenColors.knobs).map(([k,v])=>`${normalizeName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n- Keys: ${Object.entries(chosenColors.teclas).map(([k,v])=>`${normalizeName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n- Faders: ${Object.entries(chosenColors.faders).map(([k,v])=>`${normalizeName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n\n(Attached is the image downloaded from the configurator)\n`;
      const mailtoLink = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(colorSummary)}`;
      window.location.href = mailtoLink;
    }
  }, [chosenColors, getScreenshot]);
=======
  const handleAddToCart = useCallback(async () => {
    // (Opcional) Captura de pantalla eliminada del flujo por email

    const emailDestino = 'tu-email-de-negocio@ejemplo.com';
    const asunto = 'Configuración de Beato16';
    const colorSummary = `\nHola,\n\nEsta es mi configuración para el Beato16:\n\n- Chasis: ${chosenColors.chasis}\n- Botones: ${Object.values(chosenColors.buttons).join(', ') || 'Default'}\n- Knobs: ${Object.values(chosenColors.knobs).join(', ') || 'Default'}\n- Teclas: ${Object.values(chosenColors.teclas).join(', ') || 'Default'}\n- Faders: ${Object.values(chosenColors.faders).join(', ') || 'Default'}\n\n(Adjunto también los datos en formato JSON para precisión: ${JSON.stringify(chosenColors)})\n\n¡Gracias!\n`;

    const mailtoLink = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(colorSummary)}`;
    window.location.href = mailtoLink;
  }, [chosenColors]);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
  // ==================================================================
  // FIN DE LA CORRECCIÓN DE SEGURIDAD
  // ==================================================================

  

  // 1. Cargar el environment map y aplicarlo a la escena y materiales
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('public/textures/blackhole.jpg.avif', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      setEnvMap(texture);
    });
  }, []);

  // 2. Mejorar la iluminación
  const setupProfessionalLighting = useCallback((scene: THREE.Scene, _renderer: THREE.WebGLRenderer) => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 4, -1);
    mainLight.castShadow = true;
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x99ccff, 1.0);
    fillLight.position.set(-8, 3, -9);
    scene.add(fillLight);
    const fillLight2 = new THREE.DirectionalLight(0x99ccff, 1.0);
    fillLight2.position.set(-8, 3, 15);
    scene.add(fillLight2);
    const pointLight = new THREE.PointLight(0xffffff, 0.7, 0.5);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
    backLight.position.set(-5, 30, 0);
    backLight.castShadow = true;
    scene.add(backLight);
  }, []);

  // 3. Al cargar el modelo, aplicar el envMap y MeshPhysicalMaterial
  const prepareModelParts = useCallback((model: THREE.Group) => {
    const newSelectable: Selectable = { chasis: [], buttons: [], knobs: [], teclas: [], faders: [] };
<<<<<<< HEAD
    // Load previously saved choices if available
    let initialChosen: ChosenColors = { type: 'configUpdate', chasis: 'Gris', buttons: {}, knobs: {}, teclas: {}, faders: {} };
    try {
      const saved = localStorage.getItem('beato16_chosenColors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialChosen = {
            type: 'configUpdate',
            chasis: parsed.chasis || 'Gris',
            buttons: parsed.buttons || {},
            knobs: parsed.knobs || {},
            teclas: parsed.teclas || {},
            faders: parsed.faders || {}
          };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved beato16_chosenColors', e);
    }
=======
    const newChosenColors: ChosenColors = {
      type: 'configUpdate', chasis: 'Gris', buttons: {}, knobs: {}, teclas: {}, faders: {}
    };
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';
      
      if (meshName.includes('logo') || meshName.includes('beato') || meshName.includes('crearttech') || meshName.includes('custom midi')) {
        if (child.material && 'map' in child.material && child.material.map) {
          child.material.transparent = true;
          child.material.alphaTest = 0.9;
        }
      }

      if (meshName.includes('cubechasis')) {
<<<<<<< HEAD
        const chasisName = initialChosen.chasis && PALETTES.chasis[initialChosen.chasis] ? initialChosen.chasis : 'Gris';
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.chasis[chasisName].hex, 
=======
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.chasis['Gris'].hex, 
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
          metalness: 0.8, 
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
<<<<<<< HEAD
        initialChosen.chasis = chasisName;
      }
      else if (meshName.includes('boton')) {
        const savedName = initialChosen.buttons[child.name];
        const defaultColor = savedName && PALETTES.buttons[savedName] ? savedName : 'Negro';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.buttons[defaultColor].hex, metalness: 0.4, roughness: 0.68, clearcoat: 0.85, clearcoatRoughness: 0.08, reflectivity: 0.3, sheen: 0.5, sheenColor: 0x1C1C1C });
        newSelectable.buttons.push(child);
        initialChosen.buttons[child.name] = defaultColor;
=======
        newChosenColors.chasis = 'Gris';
      }
      else if (meshName.includes('boton')) {
        const defaultColor = 'Negro';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.buttons[defaultColor].hex, metalness: 0.4, roughness: 0.68, clearcoat: 0.85, clearcoatRoughness: 0.08, reflectivity: 0.3, sheen: 0.5, sheenColor: 0x1C1C1C });
        newSelectable.buttons.push(child);
        newChosenColors.buttons[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      }
      else if (meshName.includes('aro') || (meshName.includes('fader') && (meshName.includes('ring') || meshName.includes('circle')))) {
        console.log('Aro de fader configurado en prepareModelParts Beato16:', child.name);
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: 0x000000, 
          metalness: 0.0, 
          roughness: 0.2, 
          clearcoat: 0.8, 
          clearcoatRoughness: 0.1, 
          reflectivity: 0.5, 
          transmission: 0.3, 
          thickness: 0.5, 
          ior: 1.4, 
          attenuationDistance: 1.0, 
          attenuationColor: 0xffffff, 
          transparent: true, 
          opacity: 0.7 
        });
        newSelectable.buttons.push(child);
        newChosenColors.buttons[child.name] = 'Negro';
      }
      else if (meshName.includes('knob')) {
        if ((child.material as THREE.MeshStandardMaterial)?.color) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
          if (lightness < 0.5) {
<<<<<<< HEAD
            const savedName = initialChosen.knobs[child.name];
            const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
            child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0, roughness: 1 });
            newSelectable.knobs.push(child);
            initialChosen.knobs[child.name] = defaultColor;
=======
            const defaultColor = 'Negro';
            child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0, roughness: 1 });
            newSelectable.knobs.push(child);
            newChosenColors.knobs[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
          } else {
            child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          }
        }
      }
      else if (meshName.includes('tecla')) {
<<<<<<< HEAD
        const savedName = initialChosen.teclas[child.name];
        const defaultColor = savedName && PALETTES.teclas[savedName] ? savedName : 'Negro';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.teclas[defaultColor].hex, metalness: 0.4, roughness: 0.68, clearcoat: 0.85, clearcoatRoughness: 0.08, reflectivity: 0.3, sheen: 0.5, sheenColor: 0x1C1C1C });
        newSelectable.teclas.push(child);
        initialChosen.teclas[child.name] = defaultColor;
=======
        const defaultColor = 'Negro';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.teclas[defaultColor].hex, metalness: 0.4, roughness: 0.68, clearcoat: 0.85, clearcoatRoughness: 0.08, reflectivity: 0.3, sheen: 0.5, sheenColor: 0x1C1C1C });
        newSelectable.teclas.push(child);
        newChosenColors.teclas[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      }
      else if (meshName.includes('fader')) {
        console.log('Fader configurado en prepareModelParts Beato16:', child.name);
        if (meshName === 'fader1_1' || meshName === 'fader2_1' || meshName === 'fader3_1' || meshName === 'fader4_1') {
<<<<<<< HEAD
          const savedName = initialChosen.faders[child.name];
          const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
          child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0, roughness: 1 });
          newSelectable.faders.push(child);
          initialChosen.faders[child.name] = defaultColor;
=======
          const defaultColor = 'Negro';
          child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0, roughness: 1 });
          newSelectable.faders.push(child);
          newChosenColors.faders[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
        } else {
          if (child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.color) {
              const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
              if (lightness < 0.8) {
<<<<<<< HEAD
                const savedName = initialChosen.faders[child.name];
                const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
                mat.color.setHex(parseInt(PALETTES.knobs[defaultColor].hex.replace('#', ''), 16));
                newSelectable.faders.push(child);
                initialChosen.faders[child.name] = defaultColor;
=======
                const defaultColor = 'Negro';
                mat.color.setHex(parseInt(PALETTES.knobs[defaultColor].hex.replace('#', ''), 16));
                newSelectable.faders.push(child);
                newChosenColors.faders[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
              }
            }
          }
        }
      }
    });

    setSelectable(newSelectable);
<<<<<<< HEAD
    setChosenColors(initialChosen);
=======
    setChosenColors(newChosenColors);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
  }, [envMap]);

  // Centrar y escalar modelo
  const centerAndScaleModel = useCallback((obj: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const desiredSize = 1.8;
    const scale = desiredSize / maxSize;
    
    obj.scale.set(scale, scale, scale);
    obj.position.copy(center).multiplyScalar(-scale);
    obj.position.y -= (size.y / 2) * scale;
  }, []);

  // Cargar modelo
  const loadModel = useCallback(async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
      loader.load('./models/beato16.glb', (gltf: any) => {
        const model = gltf.scene as THREE.Group;
        modelRef.current = model;
        prepareModelParts(model);
        centerAndScaleModel(model);
        sceneRef.current?.add(model);
        if (!modelOriginalPositionRef.current) {
          modelOriginalPositionRef.current = model.position.clone();
        }
        
        const negroHex = 0x1C1C1C;
        model.traverse((child: any) => {
          const childName = child.name?.toLowerCase() || '';
          const isAro = childName.includes('aro');
          const isFaderRing = childName.includes('fader') && (childName.includes('ring') || childName.includes('circle'));
          
          if (child.isMesh && typeof child.name === 'string' && (isAro || isFaderRing)) {
            if (child.material && 'color' in child.material) {
              child.material.color.setHex(negroHex);
            }
            child.material = child.material.clone();
          }
          
          // Debug: mostrar nombres de faders para identificar aros asociados
          if (child.isMesh && typeof child.name === 'string' && childName.includes('fader')) {
            console.log('Fader encontrado en Beato16:', child.name);
          }
        });
      }, undefined, (error: any) => {
        console.error('ERROR AL CARGAR EL MODELO:', error);
      });
    } catch (error) {
      console.error('Error importing GLTFLoader:', error);
    }
  }, [prepareModelParts, centerAndScaleModel]);

  // Inicialización de Three.js
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 200);
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    cameraRef.current = camera;
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(CAMERA_VIEWS.normal.target);
      controls.enableDamping = true;
      controls.minDistance = 2;
      controls.maxDistance = 5;
      controlsRef.current = controls;
    });
    setupProfessionalLighting(scene, renderer);
    loadModel();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [setupProfessionalLighting, loadModel]);

  // Manejo de redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && cameraRef.current && rendererRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('beato16_currentView', currentView);
  }, [currentView]);
  useEffect(() => {
    localStorage.setItem('beato16_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Aplicar colores guardados
  useEffect(() => {
    if (selectable.chasis.length > 0) {
      if (chosenColors.chasis && PALETTES.chasis[chosenColors.chasis]) {
        const colorHex = PALETTES.chasis[chosenColors.chasis].hex;
        selectable.chasis.forEach(mesh => {
          if (mesh.material && 'color' in mesh.material) (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
        });
      }
      Object.entries(chosenColors.buttons).forEach(([buttonName, colorName]) => {
        if (PALETTES.buttons[colorName]) {
          const colorHex = PALETTES.buttons[colorName].hex;
          const buttonMesh = selectable.buttons.find(btn => btn.name === buttonName);
          if (buttonMesh && buttonMesh.material && 'color' in buttonMesh.material) (buttonMesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
        }
      });
      Object.entries(chosenColors.knobs).forEach(([knobName, colorName]) => {
        if (PALETTES.knobs[colorName]) {
          const colorHex = PALETTES.knobs[colorName].hex;
          const knobMesh = selectable.knobs.find(knob => knob.name === knobName);
          if (knobMesh && knobMesh.material && 'color' in knobMesh.material) (knobMesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
        }
      });
    }
  }, [selectable, chosenColors]);

  // Función para establecer emisivo
  const setEmissive = useCallback((object: THREE.Mesh | null, color: number = 0x000000) => {
    if (object && (object.material as THREE.MeshStandardMaterial)?.emissive) {
      (object.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    }
  }, []);

  // Manejo de clicks en el canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraRef.current || !rendererRef.current) return;
    if (currentView === 'chasis') {
      setSelectedForColoring(null);
      setSelectedButtons([]);
      return;
    }
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const bounds = rendererRef.current.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, cameraRef.current);

    let objectsToIntersect: THREE.Mesh[] = [];
    if (currentView === 'buttons') objectsToIntersect = selectable.buttons;
    else if (currentView === 'knobs') objectsToIntersect = selectable.knobs;
    else if (currentView === 'teclas') objectsToIntersect = selectable.teclas;
    else if (currentView === 'faders') objectsToIntersect = selectable.faders;
    else if (currentView === 'normal') objectsToIntersect = selectable.buttons;
    
    if (objectsToIntersect.length === 0) return;
    
    const intersects = raycaster.intersectObjects(objectsToIntersect, false);
    if (currentView !== 'normal') {
      [...selectable.buttons, ...selectable.knobs, ...selectable.teclas, ...selectable.faders].forEach(o => setEmissive(o, 0x000000));
    }
    
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object as THREE.Mesh;
      if (currentView === 'normal') return;

<<<<<<< HEAD
      const toggleMultiSelect = (setter: React.Dispatch<React.SetStateAction<THREE.Mesh[]>>, currentSelected: THREE.Mesh[], pool: THREE.Mesh[]) => {
        setSelectedForColoring(null);
        const alreadySelected = currentSelected.some(item => item.uuid === selectedObject.uuid);
        const next = alreadySelected ? currentSelected.filter(item => item.uuid !== selectedObject.uuid) : [...currentSelected, selectedObject];
        // actualizar glow
        pool.forEach(item => setEmissive(item, 0x000000));
        next.forEach(item => setEmissive(item, 0x444444));
        setter(next);
      };

      if (currentView === 'buttons') toggleMultiSelect(setSelectedButtons, selectedButtons, selectable.buttons);
      else if (currentView === 'knobs') toggleMultiSelect(setSelectedKnobs, selectedKnobs, selectable.knobs);
      else if (currentView === 'teclas') toggleMultiSelect(setSelectedTeclas, selectedTeclas, selectable.teclas);
      else if (currentView === 'faders') toggleMultiSelect(setSelectedFaders, selectedFaders, selectable.faders);
      else {
        setSelectedForColoring(selectedObject);
        setEmissive(selectedObject, 0x444444);
=======
      const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<THREE.Mesh[]>>, currentSelected: THREE.Mesh[]) => {
        setSelectedForColoring(null);
        const alreadySelected = currentSelected.find(item => item.uuid === selectedObject.uuid);
        let newSelection;
        if (event.shiftKey) {
          newSelection = alreadySelected ? currentSelected.filter(item => item.uuid !== selectedObject.uuid) : [...currentSelected, selectedObject];
        } else {
          newSelection = [selectedObject];
        }
        setter(newSelection);
        newSelection.forEach(item => setEmissive(item, 0x444444));
      };

      if (currentView === 'buttons') handleMultiSelect(setSelectedButtons, selectedButtons);
      else if (currentView === 'knobs') handleMultiSelect(setSelectedKnobs, selectedKnobs);
      else if (currentView === 'teclas') handleMultiSelect(setSelectedTeclas, selectedTeclas);
      else if (currentView === 'faders') handleMultiSelect(setSelectedFaders, selectedFaders);
      else {
          setSelectedForColoring(selectedObject);
          setEmissive(selectedObject, 0x444444);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      }
    } else {
      setSelectedForColoring(null);
      setSelectedButtons([]);
      setSelectedKnobs([]);
      setSelectedTeclas([]);
      setSelectedFaders([]);
    }
  }, [currentView, selectable, setEmissive, selectedButtons, selectedKnobs, selectedTeclas, selectedFaders]);

  // Función para encontrar el aro asociado a un botón
  const findAssociatedRing = useCallback((buttonName: string): THREE.Mesh | null => {
    if (!modelRef.current) return null;
    let associatedRing: THREE.Mesh | null = null;
    const buttonNumber = buttonName.match(/\d+/)?.[0];
    if (!buttonNumber) return null;
    modelRef.current.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.name.toLowerCase().includes('aro')) {
        const ringNumber = child.name.match(/\d+/)?.[0];
        if (ringNumber === buttonNumber) associatedRing = child;
      }
    });
    return associatedRing;
  }, []);

  const changeView = useCallback((viewName: 'normal' | 'chasis' | 'buttons' | 'knobs' | 'teclas' | 'faders') => {
    setCurrentView(viewName);
    if (viewName === 'chasis' && selectable.chasis.length > 0) setSelectedForColoring(selectable.chasis[0]);
    else setSelectedForColoring(null);
<<<<<<< HEAD

    // Al volver a vista normal, limpiar selecciones y glow
    if (viewName === 'normal') {
      if (selectedForColoring) setEmissive(selectedForColoring, 0x000000);
      [...selectedButtons, ...selectedKnobs, ...selectedTeclas, ...selectedFaders].forEach(m => setEmissive(m, 0x000000));
      setSelectedButtons([]);
      setSelectedKnobs([]);
      setSelectedTeclas([]);
      setSelectedFaders([]);
      setSelectedForColoring(null);
    }
    if (!cameraRef.current || !controlsRef.current) return;
    let targetView;
    if (viewName === 'normal') {
      targetView = CAMERA_VIEWS.normal;
      controlsRef.current.enabled = true;
    } else {
      targetView = CAMERA_VIEWS.top;
      controlsRef.current.enabled = false;
    }
=======
    if (!cameraRef.current || !controlsRef.current) return;
    let targetView, enableOrbit;
    if (viewName === 'normal') {
      targetView = CAMERA_VIEWS.normal;
      enableOrbit = true;
    } else {
      targetView = CAMERA_VIEWS.top;
      enableOrbit = false;
    }
    controlsRef.current.enabled = enableOrbit;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
    gsap.to(cameraRef.current.position, { duration: 1.2, ease: 'power3.inOut', ...targetView.pos });
    gsap.to(controlsRef.current.target, { duration: 1.2, ease: 'power3.inOut', ...targetView.target, onUpdate: () => controlsRef.current.update() });
  }, [selectable]);

  // Aplicar color
  const applyColor = useCallback((colorName: string, colorData: PaletteColor) => {
    const applyToGroup = (items: THREE.Mesh[], partType: keyof Omit<ChosenColors, 'type'|'chasis'>, setter: React.Dispatch<React.SetStateAction<THREE.Mesh[]>>) => {
        const newColors = { ...chosenColors, [partType]: { ...chosenColors[partType] } };
        items.forEach(item => {
            (item.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
            newColors[partType][item.name] = colorName;
        });
        setChosenColors(newColors);
        items.forEach(btn => setEmissive(btn, 0x000000));
        setter([]);
    };

    if (currentView === 'chasis') {
      selectable.chasis.forEach(mesh => (mesh.material as THREE.MeshStandardMaterial).color.set(colorData.hex));
      setChosenColors(prev => ({ ...prev, chasis: colorName }));
      return;
    }

    if (currentView === 'buttons' && selectedButtons.length > 0) return applyToGroup(selectedButtons, 'buttons', setSelectedButtons);
    if (currentView === 'knobs' && selectedKnobs.length > 0) return applyToGroup(selectedKnobs, 'knobs', setSelectedKnobs);
    if (currentView === 'teclas' && selectedTeclas.length > 0) return applyToGroup(selectedTeclas, 'teclas', setSelectedTeclas);
    if (currentView === 'faders' && selectedFaders.length > 0) return applyToGroup(selectedFaders, 'faders', setSelectedFaders);

    if (selectedForColoring) {
        (selectedForColoring.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
        const selectedName = selectedForColoring.name;
        let partType: keyof Omit<ChosenColors, 'type'|'chasis'> | undefined;
        if (selectable.buttons.includes(selectedForColoring)) partType = 'buttons';
        else if (selectable.knobs.includes(selectedForColoring)) partType = 'knobs';
        else if (selectable.teclas.includes(selectedForColoring)) partType = 'teclas';
        else if (selectable.faders.includes(selectedForColoring)) partType = 'faders';
        
        if(partType) {
            setChosenColors(prev => ({ ...prev, [partType]: { ...prev[partType], [selectedName]: colorName } }));
        }
        setEmissive(selectedForColoring, 0x000000);
    } else {
      Swal.fire({ title: 'Selecciona una parte', text: 'Haz clic en una pieza del controlador para aplicar el color.', imageUrl: 'models/logo.png', imageWidth: 120, imageHeight: 120, background: '#232846', color: '#fff', confirmButtonColor: '#a259ff', confirmButtonText: 'Entendido' });
    }
  }, [selectedForColoring, selectedButtons, selectedKnobs, selectedTeclas, selectedFaders, chosenColors, selectable, currentView, findAssociatedRing]);

  // Eliminado: handleOpenPayment

  // Obtener título y colores según la vista
  const getTitle = () => {
    switch (currentView) {
              case 'chasis': return 'CHOOSE THE CHASSIS COLOR';
              case 'buttons': return 'CUSTOMIZE THE BUTTONS';
              case 'knobs': return 'CHOOSE FOR THE KNOBS';
              case 'teclas': return 'CUSTOMIZE THE KEYS';
              case 'faders': return 'CUSTOMIZE THE FADERS';
              default: return 'CHOOSE A COLOR';
    }
  };
  const getCurrentColors = () => (PALETTES as any)[currentView] || {};

  
  useEffect(() => {
    prevViewRef.current = currentView;
  }, [currentView]);
  useEffect(() => {
    setTimeout(() => {
      if (cameraRef.current && controlsRef.current) {
        initialCameraPosRef.current = cameraRef.current.position.clone();
        initialCameraTargetRef.current = controlsRef.current.target.clone();
      }
    }, 100);
  }, []);

  // const particlesInit = async (main: any) => {
  //   await loadFull(main);
  // };

  const menuIcons = [
    { 
      id: 'normal', 
      icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z',
      title: 'Full View - See complete MIDI controller'
    },
    { 
      id: 'chasis', 
      icon: 'beato16.png', 
      isImage: true,
      title: 'Customize Chassis - Change main body color'
    },
    { 
      id: 'buttons', 
      icon: 'M12 1.999c5.524 0 10.002 4.478 10.002 10.002c0 5.523-4.478 10.001-10.002 10.001S1.998 17.524 1.998 12.001C1.998 6.477 6.476 1.999 12 1.999m0 1.5a8.502 8.502 0 1 0 0 17.003A8.502 8.502 0 0 0 12 3.5M11.996 6a5.998 5.998 0 1 1 0 11.996a5.998 5.998 0 0 1 0-11.996',
      title: 'Customize Buttons - Change trigger pad colors'
    },
    { 
      id: 'knobs', 
      icon: 'M9.42 4.074a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56M11.554 8.8a.5.5 0 0 1 0 .707l-1.78 1.78a.5.5 0 1 1-.708-.707l1.78-1.78a.5.5 0 0 1 .708 0 M9.42 15.444c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.03 1.32-3.19 1.32m0-1.1a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82M6.757 5.2a.56.56 0 1 0-.965.567l.465.809l.005.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm5.315.012a.55.55 0 0 1 .761-.206c.277.152.36.5.203.764l-.458.797a.56.56 0 0 1-.478.277a.564.564 0 0 1-.487-.834zm7.598 5.722a.5.5 0 0 1 .5-.5h2.52a.5.5 0 1 1 0 1h-2.52a.5.5 0 0 1-.5-.5 M22.69 15.454c2.49 0 4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52s2.03 4.52 4.52 4.52m0-1.11a3.41 3.41 0 1 1 0-6.82a3.41 3.41 0 0 1 0 6.82m-.56-9.7c0-.308.252-.56.56-.56s.56.252.56.56v.945a.566.566 0 0 1-.56.535a.56.56 0 0 1-.56-.56zm-2.103.566a.557.557 0 0 0-.763-.202a.566.566 0 0 0-.204.753l.468.815l.004.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm6.086-.204a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759c.1.067.217.078.282.078a.6.6 0 0 0 .478-.262l.005-.006l.463-.806a.55.55 0 0 0-.203-.764M11.93 22.636H9.42a.5.5 0 0 0 0 1h2.51a.5.5 0 1 0 0-1 M4.9 23.136c0 2.49 2.03 4.52 4.52 4.52s4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52m7.93 0a3.41 3.41 0 1 1-6.82 0a3.41 3.41 0 0 1 6.82 0m-3.41-6.86a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56m-3.418.93a.566.566 0 0 1 .755.206l.464.807c.137.258.06.6-.205.753a.53.53 0 0 1-.276.074a.58.58 0 0 1-.478-.261l-.005-.007l-.468-.814a.566.566 0 0 1 .207-.755zm6.08.209a.55.55 0 0 1 .761-.206c.277.151.36.499.203.764l-.462.802a.567.567 0 0 1-.766.194a.55.55 0 0 1-.194-.76zm8.475 3.588a.5.5 0 0 1 .707 0l1.78 1.78a.5.5 0 0 1-.707.707l-1.78-1.78a.5.5 0 0 1 0-.707 M22.69 27.656c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.04 1.32-3.19 1.32m0-1.11a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82 M22.13 16.836c0-.308.252-.56.56-.56s.56.252.56.56v.945a.57.57 0 0 1-.56.545a.56.56 0 0 1-.56-.56zm-2.103.576a.566.566 0 0 0-.755-.206l-.006.003a.565.565 0 0 0-.206.755l.468.814l.004.007a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.074a.566.566 0 0 0 .205-.753zm6.086-.203a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M1 5.75A4.75 4.75 0 0 1 5.75 1h20.52a4.75 4.75 0 0 1 4.75 4.75v20.48a4.75 4.75 0 0 1-4.75 4.75H5.75A4.75 4.75 0 0 1 1 26.23zM5.75 3A2.75 2.75 0 0 0 3 5.75v20.48a2.75 2.75 0 0 0 2.75 2.75h20.52a2.75 2.75 0 0 0 2.75-2.75V5.75A2.75 2.75 0 0 0 26.27 3z',
      title: 'Customize Knobs - Change rotary control colors'
    },
    { 
      id: 'teclas', 
      icon: 'M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6zm3-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H6zm2 2h8v4H8V8z',
      title: 'Customize Keys - Change piano key colors'
    },
    { 
      id: 'faders', 
      icon: 'fader.png', 
      isImage: true,
      title: 'Customize Faders - Change slider control colors'
    }
  ];

  // Eliminado: estado y efectos de moneda y PayU/PayPal

  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  
  // ==================================================================
  // DETECCIÓN DE ORIENTACIÓN
  // ==================================================================
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkOrientation();
    checkMobile();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
    
  // Eliminado: lógica y funciones de pagos

      return (
      <div>
        {/* Pantalla de rotación para móviles */}
        {!isLandscape && window.innerWidth <= 768 && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white text-center p-8">
            <div className="mb-8">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="mx-auto mb-4 animate-bounce text-cyan-400"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Rotate your device!</h2>
            <p className="text-lg mb-2">to use the configurator</p>
            <p className="text-base opacity-80">Please turn your device to landscape mode</p>
            <div className="mt-8 flex items-center space-x-2 text-sm opacity-60">
              <div className="w-8 h-5 border-2 border-current rounded-sm"></div>
              <span>→</span>
              <div className="w-5 h-8 border-2 border-current rounded-sm"></div>
            </div>
          </div>
        )}

        {/* Imagen de fondo */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            backgroundImage: 'url(/textures/fondo.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        />
        <div className="w-full h-screen text-gray-200 overflow-hidden relative" style={{ background: "transparent" }}>
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none", background: "transparent" }} />
        {/* <Particles 
          id="tsparticles" 
          init={particlesInit} 
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            particles: {
              color: { value: "#a259ff" },
              links: { enable: true, color: "#a259ff", distance: 120 },
              move: { enable: true, speed: 1 },
              number: { value: 50 },
              opacity: { value: 0.5 },
              shape: { type: "circle" },
              size: { value: 3 }
            },
            interactivity: {
              events: {
                onhover: { enable: true, mode: "repulse" }
              },
              modes: {
                repulse: { distance: 100, duration: 0.4 }
              }
            }
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 0,
            pointerEvents: "none"
          }}
        /> */}
        
        {/* Botón de inicio y BEATO (izquierda) */}
        <div 
          className="fixed top-2 md:top-4 z-50 flex items-center gap-2 md:gap-3"
          style={{ left: '70px' }}
        >
          <button
            onClick={() => window.location.href = 'https://www.crearttech.com/'}
            className="relative px-3 md:px-5 py-1 md:py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider text-white transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/55"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Home</span>
            </span>
          </button>
        </div>

        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
          <h1 className="text-2xl font-bold leading-none m-0" style={{ fontFamily: 'Gotham Black, Arial, sans-serif', color: '#fff', textShadow: '0 0 12px #a259ff, 0 0 24px #0ff, 0 0 2px #fff', letterSpacing: '0.04em' }}>BEATO16</h1>
        </div>

        <main className="flex w-full h-full" style={{ minHeight: "100vh", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden", background: "transparent" }}>
          <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1, background: "transparent" }}>
            <div ref={mountRef} className="w-full h-full transition-all duration-300" onClick={handleCanvasClick} style={{ position: "relative", zIndex: 1 }} />
          </div>
        </main>

        <div
          style={{
            position: 'fixed',
            top: 0,
            width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(300px, 35vw, 360px)',
            height: '100vh',
            display: 'flex',
<<<<<<< HEAD
            zIndex: 100,
=======
            zIndex: 10,
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
            transition: 'all 0.4s ease',
            right: window.innerWidth <= 768 ? -35 : -20
          }}
          className="mobile-panel"
        >
          {/* Columna de controles de vista */}
          <div 
            style={{
              width: 'clamp(60px, 15vw, 112px)',
              flexShrink: 0,
<<<<<<< HEAD
              paddingTop: 'clamp(20px, 5vh, 160px)',
              position: 'relative',
              zIndex: 50
=======
              paddingTop: 'clamp(20px, 5vh, 160px)'
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 6px)' }}>
              {menuIcons.map((item) => (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => changeView(item.id as any)}
                    style={{
                      width: 'clamp(40px, 10vw, 70px)',
                      height: 'clamp(40px, 10vw, 70px)',
                      padding: 'clamp(4px, 1vw, 8px)',
                      aspectRatio: '1 / 1',
                      border: '2px solid #00FFFF',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
<<<<<<< HEAD
                      zIndex: 100,
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                      transition: 'all 0.3s ease',
                      color: 'white',
                      cursor: 'pointer',
                      background: currentView === item.id 
                        ? 'linear-gradient(to bottom right, #00FFFF, #0080FF)' 
                        : 'linear-gradient(to bottom right, #000000, #1a1a1a)',
                      boxShadow: currentView === item.id ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to bottom right, #00FFFF, #0080FF)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                      const tooltip = document.createElement('div');
                      tooltip.className = 'custom-tooltip';
                      tooltip.textContent = item.title;
                      tooltip.style.cssText = `
                        position: fixed;
                        left: ${e.clientX - 20}px;
                        top: ${e.clientY - 20}px;
                        transform: translateX(-100%);
                        background: #8503adcc;
                        color: white;
                        padding: 12px 16px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: bold;
                        white-space: nowrap;
                        z-index: 999999;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        border: 2px solid #22d3ee;
                        pointer-events: none;
                      `;
                      tooltip.id = 'temp-tooltip';
                      document.body.appendChild(tooltip);
                    }}
                    onMouseLeave={(e) => {
                      if (currentView !== item.id) {
                        e.currentTarget.style.background = 'linear-gradient(to bottom right, #000000, #1a1a1a)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                      const tooltip = document.getElementById('temp-tooltip');
                      if (tooltip) {
                        tooltip.remove();
                      }
                    }}
                  >
                    {item.isImage ? (
                      <img 
                        src={`textures/${item.icon}`} 
                        alt="Menu icon" 
                        style={{
                          width: 'clamp(20px, 5vw, 40px)',
                          height: 'clamp(20px, 5vw, 40px)',
                          objectFit: 'contain',
                          margin: 'auto',
<<<<<<< HEAD
                          pointerEvents: 'none',
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                          filter: item.id === 'faders' ? 'brightness(1.5) contrast(1.3) saturate(1.2) drop-shadow(0 0 6px rgba(0, 255, 255, 0.5))' : 'none',
                          backgroundColor: item.id === 'faders' ? 'rgba(0, 0, 0, 0.1)' : 'transparent'
                        }}
                        onError={(e) => {
                          console.error('Error loading image:', e);
                          console.log('Attempted to load:', `textures/${item.icon}`);
                        }}
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={item.id === 'chasis' ? '0 0 32 32' : item.id === 'knobs' ? '0 0 32 32' : item.id === 'faders' ? '0 0 24 24' : '0 0 24 24'}
                        style={{
                          width: 'clamp(20px, 5vw, 40px)',
                          height: 'clamp(20px, 5vw, 40px)',
                          fill: 'white',
                          color: 'white',
<<<<<<< HEAD
                          margin: 'auto',
                          pointerEvents: 'none'
=======
                          margin: 'auto'
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                        }}
                        fill="#fff"
                      >
                        <path d={item.icon} />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Contenido de la UI */}
          <div 
            style={{
              flex: 1,
              padding: currentView === 'normal' ? 'clamp(4px, 1vw, 8px)' : 'clamp(12px, 2vw, 16px)',
              display: 'flex',
              flexDirection: 'column',
              background: currentView === 'normal' ? 'transparent' : 'rgba(17, 24, 39, 0.65)',
              borderLeft: currentView === 'normal' ? 'none' : '1px solid #4b5563',
              backdropFilter: currentView === 'normal' ? undefined : 'blur(6px)',
              overflowY: currentView === 'normal' ? 'visible' : 'auto'
            }}
          >
            {/* Header - Solo logo en vista normal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingBottom: 'clamp(12px, 3vw, 20px)',
                borderBottom: '1px solid #4b5563',
                paddingLeft: 0,
                justifyContent: 'center',
                gap: currentView === 'normal' ? 0 : 'clamp(4px, 1vw, 8px)',
                minHeight: currentView === 'normal' ? 'clamp(40px, 10vw, 48px)' : 'auto'
              }}
            >
              <img
                src="models/logo.png"
                alt="Logo"
                style={{
                  height: currentView === 'normal' ? 'clamp(20px, 5vw, 24px)' : 'clamp(28px, 7vw, 32px)',
                  width: 'auto',
                  filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)'
                }}
              />
            </div>

            {/* Sección de colores - solo visible cuando no está en vista normal */}
            {currentView !== 'normal' && (
              <div style={{ marginTop: 'clamp(12px, 2.5vw, 20px)' }} className="animate-fadeIn">
                <p 
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(12px, 3vw, 16px)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    margin: '0 0 clamp(10px, 2vw, 14px) 0',
                    color: '#e5e7eb',
                    textAlign: 'left'
                  }}
                  className="animate-fadeIn"
                >
                  {getTitle()}
                </p>
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    rowGap: '5px',
                    columnGap: '0px',
                    padding: 0,
                    justifyItems: 'start',
                    marginLeft: isMobile ? '-24px' : '35px',
                    transform: isMobile ? 'translateX(-36px)' : 'none',
                    transition: 'transform 150ms ease'
                  }}
                  className="animate-scaleIn"
                >
                  {Object.entries(getCurrentColors()).map(([name, colorData]: [string, any], index) => (
                    <div
                      key={name}
                      style={{
                        width: 'clamp(30px, 7vw, 44px)',
                        height: 'clamp(30px, 7vw, 44px)',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: '1px solid #a259ff',
                        boxShadow: '0 0 6px 1px rgba(162, 89, 255, 0.33)',
                        transition: 'transform 0.15s ease, margin-left 0.15s ease',
                        backgroundColor: colorData.hex,
                        animationDelay: `${index * 40}ms`,
                        marginLeft: '0px'
                      }}
                      title={name}
                      onClick={() => applyColor(name, colorData as PaletteColor)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.07)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      className="animate-fadeInUp"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {currentView === 'normal' && (
<<<<<<< HEAD
          <button onClick={handleFinalizeOpenModal} className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duración-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]">Finish and Send Configuration</button>
        )}

        {/* Modal: SweetAlert resumen + mailto/html2canvas */}
=======
          <button onClick={handleAddToCart} className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duration-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]">Finalizar y Enviar Configuración</button>
        )}

        {/* Modal eliminado: ahora el flujo es enviar por email con mailto */}
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      </div>
      );
};

export default Beato16Configurator;