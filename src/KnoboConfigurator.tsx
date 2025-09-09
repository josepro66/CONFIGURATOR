import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import { PAYU_CONFIG, getKnoboCurrencyConfig } from './payuConfig.js';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import type { ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import Swal from 'sweetalert2';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getPayuSignature } from './api';
import html2canvas from 'html2canvas';


// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  buttons: THREE.Mesh[];
  knobs: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  buttons: Record<string, string>;
  knobs: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  buttons: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
}

const MidiConfigurator: React.FC<{ onProductChange?: (product: 'beato' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {

  // === PayU CREDENTIALS (solo para pruebas, no producción) ===
  // Eliminadas variables no usadas: PAYU_API_KEY, PAYU_MERCHANT_ID, PAYU_ACCOUNT_ID, PAYU_PUBLIC_KEY, PAYU_DESCRIPTION, PAYU_CURRENCY, PAYU_TEST
  // Eliminadas variables de estado no usadas: payuSignature, setPayuSignature, payuReference, setPayuReference
  // Eliminada referencia no usada: clockRef
  // Eliminada variable no usada: precioCalculado


  // Estado para la firma PayU y referencia
  const [payuSignature, setPayuSignature] = useState("");
  const [payuReference, setPayuReference] = useState("");
  
  // Estado para responsive design
  const [isMobile, setIsMobile] = useState(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    return isMobileDevice && window.innerWidth <= 768;
  });

  const [isLandscape, setIsLandscape] = useState(false);

  // ==================================================================
  // DETECCIÓN DE ORIENTACIÓN
  // ==================================================================
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null); // OrbitControls no tiene tipado oficial en three.js
  const modelRef = useRef<THREE.Group | null>(null);
  const modelOriginalPositionRef = useRef<THREE.Vector3 | null>(null);

   // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'buttons' | 'knobs'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('knobo_chosenColors');
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
      knobs: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], buttons: [], knobs: [] });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Estado para mostrar el modal de carrito
  const [showCartModal, setShowCartModal] = useState(false);

  // Ref para guardar el estado anterior de currentView
  const prevViewRef = useRef<'normal' | 'chasis' | 'buttons' | 'knobs'>(currentView);

  // Estado para selección múltiple de botones
  const [selectedButtons, setSelectedButtons] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de knobs
  const [selectedKnobs, setSelectedKnobs] = useState<THREE.Mesh[]>([]);

  // Configuración de paletas
  const PALETTES: Palettes = {
    chasis: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    },
    buttons: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    },
    knobs: {
      'Verde':     { hex: '#7CBA40' },
      'Amarillo':  { hex: '#F3E600' },
      'Azul':      { hex: '#325EB7' },
      'Blanco':    { hex: '#F5F5F5' },
      'Naranja':   { hex: '#F47119' },
      'Morado':    { hex: '#7B217E' },
      'Rojo':      { hex: '#E52421' },
      'Negro':     { hex: '#1C1C1C' },
      'Rosa':      { hex: '#FF007F' },
      'Gris':      { hex: '#808080' },
    }
  };

  const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1, -0.1), target: new THREE.Vector3(0, -0.5, -0.1) },
    top:    { pos: new THREE.Vector3(1, 1.65, -0.4), target: new THREE.Vector3(-0.35, -0.9, -0.4) },
  };

  // Guardar posición y target iniciales de la cámara
  const initialCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraTargetRef = useRef<THREE.Vector3 | null>(null);

  // ==================================================================
  // INICIO DEL CAMBIO: Función para añadir al carrito de Wix
  // ==================================================================
  const handleAddToCart = useCallback(() => {
    // --- 1. DATOS IMPORTANTES QUE DEBES CONFIGURAR ---
    // Pega aquí el ID de tu producto base oculto que creaste en Wix Stores.
    const productId = "3d58a487-8b74-2a0b-7e04-43fca04e5333"; 

    // --- 2. LÓGICA DE TU CONFIGURADOR ---
    // Aquí debes determinar el paquete de precio y el precio final
    // basado en las elecciones del usuario.
    // Por ahora, usamos valores de ejemplo.
    const paqueteElegido = "Paquete Pro"; // Ejemplo, debes calcular esto
    const precioCalculado = 250.00; // Ejemplo, debes calcular esto

    // --- 3. RECOPILAR ESPECIFICACIONES ---
    // Tomamos los colores elegidos del estado de React.
    const chasis = chosenColors.chasis;
    const botones = Object.values(chosenColors.buttons).join(', ');
    const knobs = Object.values(chosenColors.knobs).join(', ');

    // --- 4. CREAR EL OBJETO PARA ENVIAR A WIX ---
    // Este objeto tiene el formato exacto que espera el código Velo del Paso 3.
    const cartData = {
      productId: productId,
      quantity: 1,
      options: {
        // Le dice a Wix qué opción de precio seleccionar.
        // El nombre "Tipo de Configuración" debe coincidir EXACTAMENTE 
        // con el nombre de la opción que creaste en tu producto de Wix.
        choices: {
          "Tipo de Configuración": paqueteElegido 
        },
        // Guarda las especificaciones detalladas para que se vean en el carrito.
        customTextFields: [{
          title: "Especificaciones",
          value: `Chasis: ${chasis}, Botones: ${botones}, Knobs: ${knobs}`
        }]
      }
    };

    // --- 5. ENVIAR EL MENSAJE A WIX ---
    // Esto le pasa la "nota" a la página de Wix para que añada el producto al carrito.
    if (window.parent) {
      window.parent.postMessage(cartData, "*");
      console.log("Datos del producto dinámico enviados al carrito de Wix:", cartData);
    }
    
    // Opcional: Cierra el modal después de añadir al carrito.
    setShowPaymentModal(false);
    setShowCartModal(true);

  }, [chosenColors]); // La función se recalcula si los colores elegidos cambian.
  // ==================================================================
  // FIN DEL CAMBIO
  // ==================================================================

  // Función para enviar configuración (adaptada para React)
  const sendConfigToWix = useCallback(() => {
    console.log("Enviando actualización de configuración:", chosenColors);
    if (window.parent) {
      window.parent.postMessage(chosenColors, "*");
    }
  }, [chosenColors]);

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

  // Capturar screenshot siempre desde la vista por defecto (normal)
  const getScreenshotDefaultView = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current || !controlsRef.current || !sceneRef.current) return null;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Guardar estado actual
    const prevPos = camera.position.clone();
    const prevTarget = controls.target.clone();
    const prevEnabled = controls.enabled;

    // Forzar vista normal
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    controls.target.copy(CAMERA_VIEWS.normal.target);
    controls.enabled = false;
    controls.update();

    // Renderizar y capturar
    renderer.render(sceneRef.current, camera);
    let dataUrl: string | null = null;
    try {
      dataUrl = renderer.domElement.toDataURL('image/png');
    } catch (e) {
      console.error('No se pudo capturar el screenshot (vista por defecto):', e);
    }

    // Restaurar estado
    camera.position.copy(prevPos);
    controls.target.copy(prevTarget);
    controls.enabled = prevEnabled;
    controls.update();
    renderer.render(sceneRef.current, camera);

    return dataUrl;
  }, []);

  // Modal de resumen con captura del modal completo y listas en dos columnas
  const handleFinalizeOpenModal = useCallback(async () => {
    const shot = getScreenshotDefaultView();
    if (shot) setScreenshot(shot);

    const buttonsPairs = Object.entries(chosenColors.buttons || {});
    const knobsPairs = Object.entries(chosenColors.knobs || {});

    // Helpers: translate colors and normalize names
    const spanishToEnglish: Record<string, string> = {
      'Verde': 'Green', 'Amarillo': 'Yellow', 'Azul': 'Blue', 'Blanco': 'White',
      'Naranja': 'Orange', 'Morado': 'Purple', 'Rojo': 'Red', 'Negro': 'Black',
      'Rosa': 'Pink', 'Gris': 'Gray'
    };
    const toEnglish = (name: string) => spanishToEnglish[name] || name;
    const normalizeName = (name: string) => name.replace(/Boton/gi, 'Button');
    const formatDisplayName = (name: string) => normalizeName(name).replace(/_\d+\b/i, '');

    const list = (pairs: [string, string][], empty: string) =>
      pairs.length
        ? pairs.map(([n, c]) => `<li style=\"margin:4px 0\"><strong>${formatDisplayName(n)}</strong>: ${toEnglish(c)}</li>`).join('')
        : `<li>${empty}</li>`;

    const html = `
      <div style=\"display:flex; flex-direction:column; gap:12px; text-align:left;\">
        <div style=\"display:flex; gap:16px; align-items:flex-start;\">
          ${shot ? `<img src=\"${shot}\" alt=\"Screenshot\" style=\"width:260px; height:auto; border-radius:8px; border:1px solid #4b5563\"/>` : '<div style=\"width:260px;height:160px;display:flex;align-items:center;justify-content:center;border:1px solid #4b5563;border-radius:8px;\">No screenshot</div>'}
          <div style=\"flex:1\">
            <p style=\"margin:0 0 6px 0\"><strong style=\"color:#FCD34D\">Chassis:</strong> ${toEnglish(chosenColors.chasis)}</p>
            <div>
              <p style=\"margin:8px 0 6px 0; color:#FCD34D;\"><strong>Knobs:</strong></p>
              <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${list(knobsPairs, 'Default')}</ul>
            </div>
          </div>
        </div>
      </div>`;

    const result = await Swal.fire({
      title: 'Configuration Summary',
      html,
      width: 860,
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
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'knobo-configuration-summary.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.error('No se pudo capturar el modal:', e);
        }
      },
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'swal2-confirm-custom',
        denyButton: 'swal2-deny-custom',
        cancelButton: 'swal2-cancel-custom'
      }
    });

    if (result.isConfirmed) {
      const emailDestino = 'your-business-email@example.com';
      const asunto = 'Knobo Configuration';
      const body = `\nHello,\n\nHere is my configuration for the Knobo:\n\n- Chassis: ${toEnglish(chosenColors.chasis)}\n- Knobs: ${Object.entries(chosenColors.knobs).map(([k,v])=>`${formatDisplayName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n\n(Attached is the image downloaded from the configurator)\n`;
      const link = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`;
      window.location.href = link;
    }
  }, [chosenColors, getScreenshotDefaultView]);

=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
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
  const setupProfessionalLighting = useCallback((scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
    // Luz ambiental suave
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // antes 1.2
    scene.add(ambientLight);

    // Luz direccional principal (tipo sol)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2); // antes 3.9
    mainLight.position.set(5, 4, -1);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.normalBias = 0.02;
    scene.add(mainLight);

    // Luz de relleno fría
    const fillLight = new THREE.DirectionalLight(0x99ccff, 1.0); //3.3
    fillLight.position.set(-8, 3, -9);
    scene.add(fillLight);

    // Luz de relleno adicional
    const fillLight2 = new THREE.DirectionalLight(0x99ccff, 1.0); //3.0
    fillLight2.position.set(-8, 3, 15);
    scene.add(fillLight2);

    // Luz puntual para brillos
    const pointLight = new THREE.PointLight(0xffffff, 0.7, 0.5);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // LUZ EXTRA DETRÁS DEL CONTROLADOR - KNOBO CONFIGURATOR
    // Esta luz apunta desde detrás del controlador para crear un efecto de contorno
    const backLight = new THREE.DirectionalLight(0xffffff, 1.2); //2.2
    backLight.position.set(-5, 30, 0); // Posicionada detrás del controlador
    backLight.castShadow = true;
    backLight.shadow.mapSize.width = 2048;
    backLight.shadow.mapSize.height = 2048;
    backLight.shadow.camera.near = 0.5;
    backLight.shadow.camera.far = 50;
    backLight.shadow.normalBias = 0.02;
    scene.add(backLight);
  }, []);

  // 3. Al cargar el modelo, aplicar el envMap y MeshPhysicalMaterial
  const prepareModelParts = useCallback((model: THREE.Group) => {
    const newSelectable: Selectable = { chasis: [], buttons: [], knobs: [] };
<<<<<<< HEAD
    // Load saved choices if available
    let initialChosen: ChosenColors = {
=======
    const newChosenColors: ChosenColors = {
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      type: 'configUpdate',
      chasis: 'Azul',
      buttons: {},
      knobs: {}
    };
<<<<<<< HEAD
    try {
      const saved = localStorage.getItem('knobo_chosenColors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialChosen = {
            type: 'configUpdate',
            chasis: parsed.chasis || initialChosen.chasis,
            buttons: parsed.buttons || {},
            knobs: parsed.knobs || {}
          };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved knobo_chosenColors', e);
    }
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';

      // Si es logo/texto y tiene textura PNG, puedes mejorar la visualización así:
      if (
        meshName.includes('logo') ||
        meshName.includes('beato') ||
        meshName.includes('knobo02') ||
        meshName.includes('knobo-02') ||
        meshName.includes('crearttech') ||
        meshName.includes('custom midi')
      ) {
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
=======
        newChosenColors.chasis = 'Gris';
      }
      else if (meshName.includes('boton')) {
        const defaultColor = 'Negro';
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.buttons[defaultColor].hex, 
          metalness: 0.4,
          roughness: 0.68,
          clearcoat: 0.85,
          clearcoatRoughness: 0.08,
          reflectivity: 0.3,
          sheen: 0.5,
          sheenColor: 0x1C1C1C
        });
        newSelectable.buttons.push(child);
<<<<<<< HEAD
        initialChosen.buttons[child.name] = defaultColor;
=======
        newChosenColors.buttons[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      }
      else if (meshName.includes('aro')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, reflectivity: 0.5, transmission: 0.3, thickness: 0.5, ior: 1.4, attenuationDistance: 1.0, attenuationColor: 0xffffff, transparent: true, opacity: 0.7 });
        newSelectable.buttons.push(child);
        newChosenColors.buttons[child.name] = 'Negro';
      }
      else if (meshName.includes('knob') && !meshName.includes('knobo-02')) {
        if ((child.material as THREE.MeshStandardMaterial)?.color) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
          if (lightness < 0.5) {
<<<<<<< HEAD
            const savedName = initialChosen.knobs[child.name];
            const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
=======
            const defaultColor = 'Negro';
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
            child.material = new THREE.MeshStandardMaterial({ 
              color: PALETTES.knobs[defaultColor].hex, 
              metalness: 0, 
              roughness: 1 
            });
            newSelectable.knobs.push(child);
<<<<<<< HEAD
            initialChosen.knobs[child.name] = defaultColor;
=======
            newChosenColors.knobs[child.name] = defaultColor;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
          } else {
            child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
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
      // Importar GLTFLoader dinámicamente
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
      loader.load('./models/knobo2.glb', (gltf: any) => {
        const model = gltf.scene as THREE.Group;
        modelRef.current = model;
        prepareModelParts(model);
        centerAndScaleModel(model);
        sceneRef.current?.add(model);
        // Guardar la posición original del modelo solo si no está guardada
        if (!modelOriginalPositionRef.current) {
          modelOriginalPositionRef.current = model.position.clone();
        }
        const negroHex = 0x1C1C1C;
        model.traverse((child: any) => {
          if (child.isMesh && (typeof child.name === 'string' && child.name.toLowerCase().includes('aro'))) {
            if (child.material && 'color' in child.material) {
              child.material.color.setHex(negroHex);
            }
          }
          if (child.isMesh && typeof child.name === 'string' && child.name.toLowerCase().includes('aro')) {
            child.material = child.material.clone();
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

    // Crear escena
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Crear renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      preserveDrawingBuffer: true 
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Crear cámara
    const camera = new THREE.PerspectiveCamera(
      45, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      200
    );
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    cameraRef.current = camera;

    // Crear controles (importar dinámicamente)
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

    // Bucle de animación
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
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

  // useEffect para manejar detección de móvil
  // useEffect para manejar detección de móvil
  useEffect(() => {
    const handleMobileResize = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      setIsMobile(isMobileDevice && window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleMobileResize);
    return () => window.removeEventListener('resize', handleMobileResize);
  }, []);

  // Guardar currentView en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('knobo_currentView', currentView);
  }, [currentView]);

  // Guardar chosenColors en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('knobo_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Aplicar colores guardados cuando se prepare el modelo
  useEffect(() => {
    if (selectable.chasis.length > 0 || selectable.buttons.length > 0 || selectable.knobs.length > 0) {
      // Aplicar color del chasis
      if (chosenColors.chasis && PALETTES.chasis[chosenColors.chasis]) {
        const colorHex = PALETTES.chasis[chosenColors.chasis].hex;
        selectable.chasis.forEach(mesh => {
          if (mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
          }
        });
      }

      // Aplicar colores de botones
      Object.entries(chosenColors.buttons).forEach(([buttonName, colorName]) => {
        if (PALETTES.buttons[colorName]) {
          const colorHex = PALETTES.buttons[colorName].hex;
          const buttonMesh = selectable.buttons.find(btn => btn.name === buttonName);
          if (buttonMesh && buttonMesh.material && 'color' in buttonMesh.material) {
            (buttonMesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
          }
        }
      });

      // Aplicar colores de knobs
      Object.entries(chosenColors.knobs).forEach(([knobName, colorName]) => {
        if (PALETTES.knobs[colorName]) {
          const colorHex = PALETTES.knobs[colorName].hex;
          const knobMesh = selectable.knobs.find(knob => knob.name === knobName);
          if (knobMesh && knobMesh.material && 'color' in knobMesh.material) {
            (knobMesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
          }
        }
      });
    }
  }, [selectable, chosenColors]);

  // Función para resetear configuraciones
  const resetConfigurations = useCallback(() => {
    // Limpiar localStorage
    localStorage.removeItem('knobo_currentView');
    localStorage.removeItem('knobo_chosenColors');
    
    // Resetear estados
    setCurrentView('normal');
    setChosenColors({
      type: 'configUpdate',
      chasis: 'Gris',
      buttons: {},
      knobs: {}
    });
    setSelectedButtons([]);
    setSelectedKnobs([]);
    setSelectedForColoring(null);
    
    // Mostrar confirmación
    Swal.fire({
      title: 'Configuración reseteada',
      text: 'Todas las configuraciones han sido restauradas a los valores por defecto',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }, []);

  // Función para establecer emisivo
  const setEmissive = useCallback((object: THREE.Mesh | null, color: number = 0x000000) => {
    if (object && (object.material as THREE.MeshStandardMaterial)?.emissive) {
      (object.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    }
  }, []);

  // Manejo de clicks en el canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraRef.current || !rendererRef.current) return;

    // Si la vista es 'chasis', no permitir seleccionar nada
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
    
    // Determinar qué objetos intersectar según la vista
    let objectsToIntersect: THREE.Mesh[] = [];
    if (currentView === 'buttons') {
      objectsToIntersect = selectable.buttons;
    } else if (currentView === 'knobs') {
      objectsToIntersect = selectable.knobs;
    } else if (currentView === 'normal') {
      // En vista normal, permitir clicks en botones para animación
      objectsToIntersect = selectable.buttons;
    }
    
    if (objectsToIntersect.length === 0) return;
    
    const intersects = raycaster.intersectObjects(objectsToIntersect, false);
<<<<<<< HEAD
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object as THREE.Mesh;
      
      // En vista normal, no seleccionamos para colorear
      if (currentView === 'normal') return;

      if (currentView === 'buttons') {
        // Multi-selección sin Shift (toggle). Si se hace clic en aro, usar su botón asociado
        let targetButton: THREE.Mesh = selectedObject;
        if (selectedObject.name.toLowerCase().includes('aro')) {
          const buttonNumber = parseInt(selectedObject.name.match(/\d+/)?.[0] || '1', 10);
          const associatedButton = selectable.buttons.find(btn => btn.name.toLowerCase().includes('boton') && btn.name.includes(buttonNumber.toString()));
          if (associatedButton) targetButton = associatedButton; else return;
        }

        setSelectedForColoring(null);
        setSelectedButtons(prev => {
          const already = prev.includes(targetButton);
          const next = already ? prev.filter(b => b !== targetButton) : [...prev, targetButton];
          // actualizar glow
          selectable.buttons.forEach(btn => setEmissive(btn, 0x000000));
          next.forEach(btn => setEmissive(btn, 0x444444));
          return next;
        });
      } else if (currentView === 'knobs') {
        // Multi-selección para knobs (toggle)
        setSelectedForColoring(null);
        setSelectedKnobs(prev => {
          const already = prev.includes(selectedObject);
          const next = already ? prev.filter(k => k !== selectedObject) : [...prev, selectedObject];
          selectable.knobs.forEach(k => setEmissive(k, 0x000000));
          next.forEach(k => setEmissive(k, 0x444444));
          return next;
        });
      } else {
        // Otras vistas: selección simple
        setSelectedButtons([]);
        setSelectedForColoring(selectedObject);
        setEmissive(selectedObject, 0x444444);
=======
    // Limpia el resaltado de todos los botones (solo en vista de botones)
    if (currentView === 'buttons') {
      selectable.buttons.forEach(btn => setEmissive(btn, 0x000000));
    }
    if (selectedForColoring && currentView !== 'normal') {
      setEmissive(selectedForColoring, 0x000000);
    }
    
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object as THREE.Mesh;
      
      // En vista normal, solo reproducir animación sin selección
      if (currentView === 'normal') {
        return;
      }
      
      if (currentView === 'buttons' && event.shiftKey) {
        if (selectedButtons.length === 0 && selectedForColoring && selectedForColoring !== selectedObject) {
          setSelectedButtons([selectedForColoring, selectedObject]);
          setSelectedForColoring(null);
          // Aplicar glow a ambos botones seleccionados
          setEmissive(selectedForColoring, 0x444444);
          setEmissive(selectedObject, 0x444444);
        } else {
          setSelectedForColoring(null);
          setSelectedButtons(prev => {
            if (prev.length === 0) {
              setEmissive(selectedObject, 0x444444);
              return [selectedObject];
            }
            const already = prev.includes(selectedObject);
            let newSelected;
            if (already) {
              newSelected = prev.filter(obj => obj !== selectedObject);
              // Quitar glow del botón deseleccionado
              setEmissive(selectedObject, 0x000000);
            } else {
              newSelected = [...prev, selectedObject];
              setEmissive(selectedObject, 0x444444);
            }
            // Aplicar glow a todos los botones seleccionados
            newSelected.forEach(btn => setEmissive(btn, 0x444444));
            return newSelected;
          });
        }
      } else {
        setSelectedButtons([]);
        
        // Si es un aro, seleccionar también su botón asociado
        if (currentView === 'buttons' && selectedObject.name.toLowerCase().includes('aro')) {
          // Buscar el botón asociado al aro
          const buttonNumber = parseInt(selectedObject.name.match(/\d+/)?.[0] || '1', 10);
          const associatedButton = selectable.buttons.find(btn => 
            btn.name.toLowerCase().includes('boton') && 
            btn.name.includes(buttonNumber.toString())
          );
          if (associatedButton) {
            setSelectedForColoring(associatedButton);
            setEmissive(associatedButton, 0x444444);
          } else {
            // Si no encuentra el botón, NO selecciona ni resalta nada
            setSelectedForColoring(null);
            return;
          }
        } else {
          // Si es un botón, seleccionarlo normalmente
          setSelectedForColoring(selectedObject);
          // Aplicar glow al botón seleccionado
          setEmissive(selectedObject, 0x444444);
        }
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      }
    } else {
      setSelectedForColoring(null);
      setSelectedButtons([]);
<<<<<<< HEAD
      setSelectedKnobs([]);
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
    }
  }, [currentView, selectable, selectedForColoring, setEmissive, selectedButtons]);

  // Función para encontrar el aro asociado a un botón
  const findAssociatedRing = useCallback((buttonName: string): THREE.Mesh | null => {
    if (!modelRef.current) return null;
    let associatedRing: THREE.Mesh | null = null;
    // Extrae el número del botón (por ejemplo, 'Boton1' => '1')
    const buttonNumber = buttonName.match(/\d+/)?.[0];
    if (!buttonNumber) return null;
    modelRef.current.traverse((child: THREE.Object3D) => {
      if (
        child instanceof THREE.Mesh &&
        child.name.toLowerCase().includes('aro')
      ) {
        // Extrae el número del aro
        const ringNumber = child.name.match(/\d+/)?.[0];
        if (ringNumber === buttonNumber) {
          associatedRing = child;
        }
      }
    });
    return associatedRing;
  }, []);

  const changeView = useCallback((viewName: 'normal' | 'chasis' | 'buttons' | 'knobs') => {
    setCurrentView(viewName);

    if (viewName === 'chasis' && selectable.chasis.length > 0) {
      setSelectedForColoring(selectable.chasis[0]);
    } else {
      setSelectedForColoring(null);
    }

<<<<<<< HEAD
    // Al volver a vista normal, limpiar selecciones y quitar glow
    if (viewName === 'normal') {
      if (selectedForColoring) setEmissive(selectedForColoring, 0x000000);
      selectedButtons.forEach(btn => setEmissive(btn, 0x000000));
      selectedKnobs.forEach(knob => setEmissive(knob, 0x000000));
      setSelectedButtons([]);
      setSelectedKnobs([]);
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

    let targetView;
    let enableOrbit;
    if (viewName === 'normal') {
      targetView = CAMERA_VIEWS.normal;
      enableOrbit = true;
    } else {
      targetView = CAMERA_VIEWS.top;
      enableOrbit = false;
    }
    controlsRef.current.enabled = enableOrbit;
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

    // Animar la cámara y el target igual que en el código vanilla
    gsap.to(cameraRef.current.position, { 
      duration: 1.2, 
      ease: 'power3.inOut', 
      ...targetView.pos 
    });
    gsap.to(controlsRef.current.target, { 
      duration: 1.2, 
      ease: 'power3.inOut', 
      ...targetView.target, 
      onUpdate: () => controlsRef.current.update() 
    });
<<<<<<< HEAD
  }, [selectable, selectedForColoring, selectedButtons, selectedKnobs, setEmissive]);
=======
  }, [selectable]);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

  // Aplicar color
  const applyColor = useCallback((colorName: string, colorData: PaletteColor) => {
    // Si estamos en la vista de chasis, aplica el color a todos los meshes del chasis
    if (currentView === 'chasis') {
      selectable.chasis.forEach(mesh => {
        (mesh.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
      });
      setChosenColors(prev => ({ ...prev, chasis: colorName }));
      return;
    }

    // Si hay selección múltiple de botones
    if (currentView === 'buttons' && selectedButtons.length > 0) {
      const newChosenColors = { ...chosenColors, buttons: { ...chosenColors.buttons } };
      selectedButtons.forEach(btn => {
        (btn.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
        newChosenColors.buttons[btn.name] = colorName;
        // Cambiar color del aro correspondiente
        const associatedRing = findAssociatedRing(btn.name);
        if (associatedRing && associatedRing.material) {
          (associatedRing.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
          // Opcional: puedes guardar el color del aro en chosenColors si lo necesitas
        }
      });
      setChosenColors(newChosenColors);
      selectedButtons.forEach(btn => setEmissive(btn, 0x000000));
      setSelectedButtons([]);
      return;
    }

    // En la vista de knobs, si hay selección múltiple
    if (currentView === 'knobs' && selectedKnobs.length > 0) {
      const newChosenColors = { ...chosenColors, knobs: { ...chosenColors.knobs } };
      selectedKnobs.forEach(knob => {
        (knob.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
        newChosenColors.knobs[knob.name] = colorName;
      });
      setChosenColors(newChosenColors);
      selectedKnobs.forEach(knob => setEmissive(knob, 0x000000));
      setSelectedKnobs([]);
      return;
    }

    // Selección individual
    if (!selectedForColoring) {
      Swal.fire({
        title: 'Selecciona una parte',
        text: 'Haz clic en una pieza del controlador para aplicar el color.',
        imageUrl: 'models/logo.png', // Cambia por la ruta de tu ilustración
        imageWidth: 120,
        imageHeight: 120,
        background: '#232846',
        color: '#fff',
        confirmButtonColor: '#a259ff',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    (selectedForColoring.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
    const newChosenColors = { ...chosenColors };
    const selectedName = selectedForColoring.name;
    if (selectable.buttons.includes(selectedForColoring)) {
      newChosenColors.buttons[selectedName] = colorName;
      // Cambiar color del aro correspondiente SOLO para ese botón
      if (selectedName.toLowerCase().includes('boton')) {
        const associatedRing = findAssociatedRing(selectedName);
        if (associatedRing && associatedRing.material) {
          (associatedRing.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
          // Opcional: puedes guardar el color del aro en chosenColors si lo necesitas
        }
      }
      // Quitar glow del botón seleccionado
      setEmissive(selectedForColoring, 0x000000);
    } else if (selectable.knobs.includes(selectedForColoring)) {
      newChosenColors.knobs[selectedName] = colorName;
    }
    setChosenColors(newChosenColors);
  }, [selectedForColoring, selectedButtons, chosenColors, selectable, currentView, findAssociatedRing, selectedKnobs]);

  // Abrir modal de pago y capturar imagen con vista frontal fija
  const handleOpenPayment = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    // Guardar posición, target y FOV originales
    const originalPos = cameraRef.current.position.clone();
    const originalTarget = controlsRef.current ? controlsRef.current.target.clone() : null;
    const originalFov = cameraRef.current.fov;

    // Mover a la posición inicial (frontal) - usar la vista normal mejorada
    const initialPos = CAMERA_VIEWS.normal.pos.clone();
    const initialTarget = CAMERA_VIEWS.normal.target.clone();
    cameraRef.current.position.copy(initialPos);
    cameraRef.current.fov = 35; // FOV ligeramente más amplio para mejor vista
    cameraRef.current.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialTarget);
      controlsRef.current.update();
    }

    setTimeout(() => {
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      const img = rendererRef.current!.domElement.toDataURL('image/png');
      setScreenshot(img);

      // Restaurar posición, target y FOV originales
      cameraRef.current!.position.copy(originalPos);
      cameraRef.current!.fov = originalFov;
      cameraRef.current!.updateProjectionMatrix();
      if (controlsRef.current && originalTarget) {
        controlsRef.current.target.copy(originalTarget);
        controlsRef.current.update();
      }
      setShowPaymentModal(true);
    }, 50);
  }, [rendererRef, sceneRef, cameraRef, controlsRef, CAMERA_VIEWS, setScreenshot, setShowPaymentModal]);

  // Función para manejar el checkout de PayU localmente
  const handlePayUCheckoutLocal = () => {
    const popupTarget = 'payu_checkout';
    let popupRef = window.open('', popupTarget);
    
    if (!popupRef) {
      alert('Please allow popups to continue with payment');
      return;
    }

    // Obtener configuración de la moneda seleccionada
    const currencyConfig = getKnoboCurrencyConfig(selectedCurrency);
    
    // Generar firma localmente
    const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${payuData.referenceCode}~${currencyConfig.amount}~${selectedCurrency}`;
    const signature = MD5(signatureString).toString();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = currencyConfig.url;
    form.target = popupTarget;

    const formData = {
      merchantId: PAYU_CONFIG.MERCHANT_ID,
      accountId: currencyConfig.accountId,
      description: `Knobo Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`,
      referenceCode: payuData.referenceCode,
      amount: currencyConfig.amount,
      currency: selectedCurrency,
      buyerEmail: payuData.buyerEmail,
      signature: signature,
      test: PAYU_CONFIG.TEST_MODE ? '1' : '0',
      confirmationUrl: PAYU_CONFIG.CONFIRMATION_URL,
      responseUrl: PAYU_CONFIG.RESPONSE_URL,
      // Parámetros para forzar moneda y país
      lng: currencyConfig.language,
      // Datos del modal para el webhook
      extra1: 'Knobo',
      extra2: chosenColors.chasis || 'Custom',
      extra3: `Applied colors - Buttons: ${Object.keys(chosenColors.buttons || {}).length}, Knobs: ${Object.keys(chosenColors.knobs || {}).length}`,
      extra4: `Knobo Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`,
      // Additional parameters for PayU
      payerCountry: 'CO',
      payerCity: 'Bogota',
      payerPhone: '+57-300-1234567',
      // Forzar configuración regional
      country: 'CO',
      // Evitar detección automática de ubicación
      ipAddress: '8.8.4.4'
    };

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Obtener título según la vista
  const getTitle = () => {
    switch (currentView) {
              case 'chasis': return 'CHOOSE THE CHASSIS COLOR';
              case 'buttons': return 'CUSTOMIZE THE BUTTONS';
              case 'knobs': return 'CUSTOMIZE THE KNOBS';
              default: return 'CHOOSE A COLOR';
    }
  };

  // Obtener colores según la vista
  const getCurrentColors = () => {
    switch (currentView) {
      case 'chasis': return PALETTES.chasis;
      case 'buttons': return PALETTES.buttons;
      case 'knobs': return PALETTES.knobs;
      default: return {};
    }
  };

  // Enviar configuración cuando cambie
  useEffect(() => {
    sendConfigToWix();
  }, [sendConfigToWix]);

  // Actualizar la referencia de la vista anterior
  useEffect(() => {
    prevViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    // Guardar la posición y target iniciales después de montar la cámara y controles
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
    { id: 'normal', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z', title: 'Full View - See complete MIDI controller' },
    { id: 'chasis', icon: 'knobo.png', title: 'Customize Chassis - Change main body color', isImage: true },
    { id: 'knobs', icon: 'M9.42 4.074a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56M11.554 8.8a.5.5 0 0 1 0 .707l-1.78 1.78a.5.5 0 1 1-.708-.707l1.78-1.78a.5.5 0 0 1 .708 0 M9.42 15.444c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.03 1.32-3.19 1.32m0-1.1a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82M6.757 5.2a.56.56 0 1 0-.965.567l.465.809l.005.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm5.315.012a.55.55 0 0 1 .761-.206c.277.152.36.5.203.764l-.458.797a.56.56 0 0 1-.478.277a.564.564 0 0 1-.487-.834zm7.598 5.722a.5.5 0 0 1 .5-.5h2.52a.5.5 0 1 1 0 1h-2.52a.5.5 0 0 1-.5-.5 M22.69 15.454c2.49 0 4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52s2.03 4.52 4.52 4.52m0-1.11a3.41 3.41 0 1 1 0-6.82a3.41 3.41 0 0 1 0 6.82m-.56-9.7c0-.308.252-.56.56-.56s.56.252.56.56v.945a.566.566 0 0 1-.56.535a.56.56 0 0 1-.56-.56zm-2.103.566a.557.557 0 0 0-.763-.202a.566.566 0 0 0-.204.753l.468.815l.004.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm6.086-.204a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M11.93 22.636H9.42a.5.5 0 0 0 0 1h2.51a.5.5 0 1 0 0-1 M4.9 23.136c0 2.49 2.03 4.52 4.52 4.52s4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52m7.93 0a3.41 3.41 0 1 1-6.82 0a3.41 3.41 0 0 1 6.82 0m-3.41-6.86a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56m-3.418.93a.566.566 0 0 1 .755.206l.464.807c.137.258.06.6-.205.753a.53.53 0 0 1-.276.074a.58.58 0 0 1-.478-.261l-.005-.007l-.468-.814a.566.566 0 0 1 .207-.755zm6.08.209a.55.55 0 0 1 .761-.206c.277.151.36.499.203.764l-.462.802a.567.567 0 0 1-.766.194a.55.55 0 0 1-.194-.76zm8.475 3.588a.5.5 0 0 1 .707 0l1.78 1.78a.5.5 0 0 1-.707.707l-1.78-1.78a.5.5 0 0 1 0-.707 M22.69 27.656c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.04 1.32-3.19 1.32m0-1.11a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82 M22.13 16.836c0-.308.252-.56.56-.56s.56.252.56.56v.945a.57.57 0 0 1-.56.545a.56.56 0 0 1-.56-.56zm-2.103.576a.566.566 0 0 0-.755-.206l-.006.003a.565.565 0 0 0-.206.755l.468.814l.004.007a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.074a.566.566 0 0 0 .205-.753zm6.086-.203a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M1 5.75A4.75 4.75 0 0 1 5.75 1h20.52a4.75 4.75 0 0 1 4.75 4.75v20.48a4.75 4.75 0 0 1-4.75 4.75H5.75A4.75 4.75 0 0 1 1 26.23zM5.75 3A2.75 2.75 0 0 0 3 5.75v20.48a2.75 2.75 0 0 0 2.75 2.75h20.52a2.75 2.75 0 0 0 2.75-2.75V5.75A2.75 2.75 0 0 0 26.27 3z', title: 'Knobs' }
  ];

  // Estado para selección de moneda
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  
  const [payuData, setPayuData] = useState({
    referenceCode: `knobo_${Date.now()}`,
    amount: '100.00', // Se actualiza según la moneda
    currency: 'USD',
    signature: '',
    description: 'Knobo Configurator',
    buyerEmail: 'customer@email.com',
  });

  // Actualizar datos de PayU cuando cambie la moneda
  useEffect(() => {
    const currencyConfig = getKnoboCurrencyConfig(selectedCurrency);
    setPayuData(prev => ({
      ...prev,
      amount: currencyConfig.amount,
      currency: selectedCurrency,
      description: `Knobo Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`
    }));
  }, [selectedCurrency]);

  // Al abrir el modal de carrito, genera un referenceCode único
  useEffect(() => {
    if (showCartModal || showPaymentModal) {
      const uniqueRef = `knobo-${Date.now()}`;
      setPayuData(prev => ({ ...prev, referenceCode: uniqueRef }));
    }
  }, [showCartModal, showPaymentModal]);

  // Función para validar email simple
  // Elimina la función isValidEmail

  const PAYPAL_CLIENT_ID = "sb"; // Cambia por tu clientId real en producción

  const [sidebarFiles, setSidebarFiles] = useState<File[]>([]);
  const handleSidebarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSidebarFiles(Array.from(e.target.files));
      // Aquí puedes hacer lo que quieras con los archivos (enviarlos, mostrarlos, etc.)
    }
  };

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
      {/* Fondo degradado estático recomendado */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
          background: "transparent"
        }}
      />
      {/* Fondo de partículas global - TEMPORALMENTE DESHABILITADO */}
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
      {/* Botón de inicio y KNOBO (izquierda) */}
      <div 
        className="fixed top-2 md:top-4 z-50 flex items-center gap-2 md:gap-3"
        style={{ left: '-20px' }}
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

      {/* Título centrado */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
        <h1 
          className="text-2xl font-bold leading-none m-0" 
          style={{ 
            fontFamily: 'Gotham Black, Arial, sans-serif',
            color: '#fff',
            textShadow: '0 0 12px #a259ff, 0 0 24px #0ff, 0 0 2px #fff',
            letterSpacing: '0.04em'
          }}
        >
          KNOBO
        </h1>
      </div>

      {/* Container principal */}
      <main className="flex w-full h-full" style={{ minHeight: "100vh", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden", background: "transparent" }}>
        {/* Canvas container */}
        <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1, background: "transparent" }}>
          <div
            ref={mountRef}
            className="w-full h-full transition-all duration-300"
            onClick={handleCanvasClick}
            style={{ position: "relative", zIndex: 1 }}
          />
        </div>
      </main>

<<<<<<< HEAD
      {/* Panel de UI (alineado a Beato16) */}
=======
      {/* Panel de UI */}
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      <div
        className="mobile-panel"
        style={{
          position: 'fixed',
          top: 0,
<<<<<<< HEAD
          width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(300px, 35vw, 360px)',
          height: '100vh',
          display: 'flex',
          zIndex: 100,
          transition: 'all 0.4s ease',
          right: window.innerWidth <= 768 ? -35 : -20
=======
          right: '-35px',
          width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(280px, 70vw, 320px)',
          height: '100vh',
          display: 'flex',
          zIndex: 10,
          transition: 'all 0.4s ease'
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
        }}
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
            {menuIcons.map(({ id, icon, title, isImage }) => (
      <button
        key={id}
        onClick={
          id === 'faders'
            ? undefined
            : () => changeView(id as 'normal' | 'chasis' | 'buttons' | 'knobs')
        }
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
          cursor: id === 'faders' ? 'not-allowed' : 'pointer',
          background: currentView === id 
            ? 'linear-gradient(to bottom right, #00FFFF, #0080FF)' 
            : 'linear-gradient(to bottom right, #000000, #1a1a1a)',
          boxShadow: currentView === id ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
        }}
        disabled={id === 'faders'}
        onMouseEnter={(e) => {
          if (id !== 'faders') {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #00FFFF, #0080FF)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
          }
          const tooltip = document.createElement('div');
          tooltip.className = 'custom-tooltip';
          tooltip.textContent = title;
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
            border: 2px solid #f87171;
            pointer-events: none;
          `;
          tooltip.id = 'temp-tooltip';
          document.body.appendChild(tooltip);
        }}
        onMouseLeave={(e) => {
          if (id !== 'faders' && currentView !== id) {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #000000, #1a1a1a)';
            e.currentTarget.style.boxShadow = 'none';
          }
          const tooltip = document.getElementById('temp-tooltip');
          if (tooltip) {
            tooltip.remove();
          }
        }}
      >
        {isImage ? (
          <img 
            src={`textures/${icon}`}
            alt={title}
            style={{
              width: 'clamp(20px, 5vw, 40px)',
              height: 'clamp(20px, 5vw, 40px)',
              objectFit: 'contain',
<<<<<<< HEAD
              margin: 'auto',
              pointerEvents: 'none'
=======
              margin: 'auto'
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
            }}
            onError={(e) => {
              console.error('Error loading image:', e);
              console.log('Attempted to load:', `textures/${icon}`);
            }}
          />
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox={id === 'knobs' ? '0 0 32 32' : id === 'faders' ? '0 0 256 256' : '0 0 24 24'}
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
            <path d={icon} />
          </svg>
        )}
      </button>
    ))}

  </div>
</div>

<<<<<<< HEAD
        {/* Contenido de la UI (fondo, borde y padding como Beato16) */}
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
=======
        {/* Contenido de la UI */}
        <div 
          style={{
            flex: 1,
            padding: 'clamp(4px, 1vw, 8px)',
            display: 'flex',
            flexDirection: 'column'
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
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

<<<<<<< HEAD
          {/* Sección de colores - igual a Beato16 */}
          {currentView !== 'normal' && (
            <div style={{ marginTop: 'clamp(12px, 2.5vw, 20px)' }} className="animate-fadeIn">
              <p 
                style={{
                  fontWeight: 900,
                  fontSize: 'clamp(12px, 3vw, 16px)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  margin: '0 0 clamp(10px, 2vw, 14px) 0',
=======
          {/* Sección de colores - solo visible cuando no está en vista normal */}
          {currentView !== 'normal' && (
            <div style={{ marginTop: 'clamp(16px, 4vw, 24px)' }} className="animate-fadeIn">
              <p 
                style={{
                  fontWeight: 900,
                  fontSize: 'clamp(10px, 2.5vw, 14px)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  margin: '0 0 clamp(8px, 2vw, 12px) 0',
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
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
<<<<<<< HEAD
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
=======
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'clamp(4px, 1vw, 6px)',
                  padding: 0,
                  justifyItems: 'end',
                  marginLeft: 'auto'
                }}
                className="animate-scaleIn"
              >
                {Object.entries(getCurrentColors()).map(([name, colorData], index) => (
                  <div
                    key={name}
                    style={{
                      width: 'clamp(32px, 8vw, 40px)',
                      height: 'clamp(32px, 8vw, 40px)',
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: '1px solid #a259ff',
                      boxShadow: '0 0 6px 1px rgba(162, 89, 255, 0.33)',
<<<<<<< HEAD
                      transition: 'transform 0.15s ease, margin-left 0.15s ease',
                      backgroundColor: (colorData as any).hex,
                      animationDelay: `${index * 40}ms`,
                      marginLeft: '0px'
                    }}
                    title={name}
                    onClick={() => applyColor(name, colorData as any)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.07)';
=======
                      transition: 'all 0.2s ease',
                      backgroundColor: colorData.hex,
                      animationDelay: `${index * 50}ms`
                    }}
                    title={name}
                    onClick={() => applyColor(name, colorData)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
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

<<<<<<< HEAD
      {/* Botón de finalizar (solo visible en vista normal) */}
      {currentView === 'normal' && (
        <button 
          onClick={handleFinalizeOpenModal}
          className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duración-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]"
        >
          Finish and Send Configuration
=======
      {/* Botón de comprar (solo visible en vista normal) */}
      {currentView === 'normal' && (
        <button 
          onClick={() => {
            const emailDestino = 'tu-email-de-negocio@ejemplo.com';
            const asunto = 'Configuración de Knobo';
            const body = `\nHola,\n\nEsta es mi configuración para el Knobo:\n\n- Chasis: ${chosenColors.chasis}\n- Botones: ${Object.values(chosenColors.buttons).join(', ') || 'Default'}\n- Knobs: ${Object.values(chosenColors.knobs).join(', ') || 'Default'}\n\n(Adjunto también los datos en formato JSON para precisión: ${JSON.stringify(chosenColors)})\n\n¡Gracias!\n`;
            const link = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`;
            window.location.href = link;
          }}
          className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duración-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]"
        >
          Finalizar y Enviar Configuración
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
        </button>
      )}

      {/* Modal de pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative bg-[#3a4060] rounded-2xl shadow-2xl border-2 border-[#a259ff] p-4 md:py-4 md:px-8 w-full max-w-4xl mx-4 animate-fade-in">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-pink-400 text-2xl font-bold">×</button>
            <h2 className="text-3xl md:text-4xl font-bold text-purple-400 mb-4 text-center tracking-widest">PAGO SEGURO - KNOBO</h2>
            <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
              <div className="w-full max-w-[320px] md:max-w-[380px] aspect-[4/3] flex items-center justify-center ml-16 md:ml-24">
                {screenshot && (
                  <img src={screenshot} alt="Custom controller" className="w-full h-full object-contain" style={{ background: 'none', boxShadow: 'none', border: 'none' }} />
                )}
              </div>
              <div className="flex-1 mt-8 md:mt-0">
                <h3 className="text-xl font-semibold mb-2 text-cyan-400">Tu configuración:</h3>
                <ul className="text-base space-y-1">
                  <li><b>Chassis:</b> {chosenColors.chasis}</li>
                  <li><b>Buttons:</b> {Object.values(chosenColors.buttons).join(', ') || 'Default'}</li>
                  <li><b>Knobs:</b> {Object.values(chosenColors.knobs).join(', ') || 'Default'}</li>
                </ul>
              </div>
            </div>
            {/* Selector de moneda */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-cyan-400">Select your currency:</h3>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setSelectedCurrency('USD')}
                  className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
                    selectedCurrency === 'USD'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_12px_2px_#3b82f6]'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  USD $100.00
                </button>
                <button
                  onClick={() => setSelectedCurrency('COP')}
                  className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
                    selectedCurrency === 'COP'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_12px_2px_#3b82f6]'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  COP $400,000
                </button>
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                Selected price: {selectedCurrency} {getKnoboCurrencyConfig(selectedCurrency).symbol}{getKnoboCurrencyConfig(selectedCurrency).amount}
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-4">
                              {/* PayPal temporarily disabled - only PayU available */}
                <div className="w-full py-3 rounded-lg bg-gray-600 text-gray-400 font-bold text-lg text-center">
                  PayPal temporarily unavailable
                </div>
                <button
                  onClick={handlePayUCheckoutLocal}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-400 to-cyan-400 text-white font-bold text-lg shadow-[0_0_12px_2px_#0ff580] hover:scale-105 transition-all mt-2"
                >
                  Pay with PayU ({selectedCurrency} {getKnoboCurrencyConfig(selectedCurrency).symbol}{getKnoboCurrencyConfig(selectedCurrency).amount})
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-6 text-center">Your purchase is 100% safe and protected.</p>
          </div>
        </div>
      )}

      {/* Modal de carrito */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative bg-[#232846] rounded-2xl shadow-2xl border-2 border-[#a259ff] p-6 w-full max-w-2xl mx-4 animate-fade-in flex flex-col items-center">
            <button onClick={() => setShowCartModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-pink-400 text-2xl font-bold">×</button>
            <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-4 text-center tracking-widest">Cart</h2>
            <div className="flex flex-col md:flex-row gap-4 items-center w-full">
              <div className="w-full max-w-[220px] aspect-[4/3] flex items-center justify-center">
                {screenshot && (
                  <img src={screenshot} alt="Custom controller" className="w-full h-full object-contain" style={{ background: 'none', boxShadow: 'none', border: 'none' }} />
                )}
              </div>
              <div className="flex-1 mt-4 md:mt-0 w-full">
                <h3 className="text-lg font-semibold mb-2 text-cyan-400">Your Product:</h3>
                <ul className="text-base space-y-1 mb-2">
                  <li><b>Chassis:</b> {chosenColors.chasis}</li>
                  <li><b>Buttons:</b> {Object.values(chosenColors.buttons).join(', ') || 'Default'}</li>
                  <li><b>Knobs:</b> {Object.values(chosenColors.knobs).join(', ') || 'Default'}</li>
                </ul>
                <div className="text-xl font-bold text-green-300 mb-2">${payuData.amount} USD</div>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-6 w-full">
              <PayPalButtons
                style={{ layout: "horizontal", color: "blue", shape: "rect", label: "paypal", height: 48 }}
                createOrder={(data, actions) => {
                  if (!actions.order) return Promise.reject("PayPal actions.order no disponible");
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          value: payuData.amount || "185.00",
                          currency_code: "USD"
                        },
                        description: "Custom MIDI controller"
                      }
                    ]
                  });
                }}
                onApprove={async (data, actions) => {
                  if (actions && actions.order) {
                    const details = await actions.order.capture();
                    const buyerEmail = details?.payer?.email_address || '';
                    // Enviar configuración personalizada al backend
                    try {
                      await fetch('http://localhost:4000/api/paypal-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          colors: chosenColors,
                          screenshot,
                          paypalOrderId: data.orderID,
                          buyerEmail
                        })
                      });
                    } catch (err) {
                      alert('Error guardando configuración personalizada en backend: ' + err);
                    }
                    alert("¡Pago realizado con PayPal!");
                    setShowPaymentModal(false);
                    setShowCartModal(true);
                  }
                }}
                onError={(err) => {
                  alert("Error en el pago con PayPal: " + err);
                }}
              />
              <form action="https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/" method="post" target="_blank" className="w-full flex flex-col items-center">
                <input type="hidden" name="merchantId" value="508029" />
                <input type="hidden" name="accountId" value="512321" />
                <input type="hidden" name="description" value="Custom MIDI controller" />
                <input type="hidden" name="referenceCode" value={payuData.referenceCode} />
                <input type="hidden" name="amount" value={payuData.amount} />
                <input type="hidden" name="currency" value={payuData.currency} />
                <input type="hidden" name="signature" value={payuData.signature} />
                <input type="hidden" name="test" value="1" />
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-400 to-cyan-400 text-white font-bold text-lg shadow-[0_0_12px_2px_#0ff580] hover:scale-105 transition-all mt-2"
                >
                  Pagar con PayU
                </button>
              </form>
            </div>
            <p className="text-xs text-gray-400 mt-6 text-center">Tu compra es 100% segura y protegida.</p>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default MidiConfigurator;