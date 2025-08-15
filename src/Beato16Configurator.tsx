import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { getPayuSignature } from './api';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import type { ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
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

const Beato16Configurator: React.FC<{ onProductChange?: (product: 'beato' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {
  // Estado para la firma PayU y referencia
  const [payuSignature, setPayuSignature] = useState("");
  const [payuReference, setPayuReference] = useState("");

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Estado para mostrar el modal de carrito
  const [showCartModal, setShowCartModal] = useState(false);

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
  const handleAddToCart = useCallback(async () => {
    const chasis = chosenColors.chasis;
    const botones = Object.values(chosenColors.buttons).join(', ');
    const knobs = Object.values(chosenColors.knobs).join(', ');
    const teclas = Object.values(chosenColors.teclas).join(', ');
    const faders = Object.values(chosenColors.faders).join(', ');

    const configDetails = {
      chasis,
      botones,
      knobs,
      teclas,
      faders,
      screenshot, // Include screenshot if available
    };

    try {
      const response = await fetch('http://localhost:3002/api/send-config-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configDetails),
      });

      if (response.ok) {
        Swal.fire({
          title: '¡Configuración enviada!',
          text: 'Hemos enviado los detalles de tu configuración a tu correo.',
          icon: 'success',
          background: '#232846',
          color: '#FFFFFF',
          confirmButtonColor: '#a259ff',
        });
      } else {
        Swal.fire({
          title: 'Error al enviar',
          text: 'No pudimos enviar los detalles de tu configuración. Por favor, inténtalo de nuevo.',
          icon: 'error',
          background: '#232846',
          color: '#FFFFFF',
          confirmButtonColor: '#a259ff',
        });
      }
    } catch (error) {
      console.error('Error sending configuration email:', error);
      Swal.fire({
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor para enviar la configuración.',
        icon: 'error',
        background: '#232846',
        color: '#FFFFFF',
        confirmButtonColor: '#a259ff',
      });
    }

    setShowPaymentModal(false);
    setShowCartModal(true); // This modal will now indicate email sent, not Wix cart.
  }, [chosenColors, screenshot]);
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
  const setupProfessionalLighting = useCallback((scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
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
    const newChosenColors: ChosenColors = {
      type: 'configUpdate', chasis: 'Gris', buttons: {}, knobs: {}, teclas: {}, faders: {}
    };

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
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.chasis['Gris'].hex, 
          metalness: 0.8, 
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
        newChosenColors.chasis = 'Gris';
      }
      else if (meshName.includes('boton')) {
        const defaultColor = 'Negro';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.buttons[defaultColor].hex, metalness: 0.4, roughness: 0.68, clearcoat: 0.85, clearcoatRoughness: 0.08, reflectivity: 0.3, sheen: 0.5, sheenColor: 0x1C1C1C });
        newSelectable.buttons.push(child);
        newChosenColors.buttons[child.name] = defaultColor;
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
            const defaultColor = 'Negro';
            child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0, roughness: 1 });
            newSelectable.knobs.push(child);
            newChosenColors.knobs[child.name] = defaultColor;
          } else {
            child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          }
        }
      }
      else if (meshName.includes('tecla')) {
        const defaultColor = 'Negro';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.teclas[defaultColor].hex, metalness: 0.4, roughness: 0.68, clearcoat: 0.85, clearcoatRoughness: 0.08, reflectivity: 0.3, sheen: 0.5, sheenColor: 0x1C1C1C });
        newSelectable.teclas.push(child);
        newChosenColors.teclas[child.name] = defaultColor;
      }
      else if (meshName.includes('fader')) {
        console.log('Fader configurado en prepareModelParts Beato16:', child.name);
        if (meshName === 'fader1_1' || meshName === 'fader2_1' || meshName === 'fader3_1' || meshName === 'fader4_1') {
          const defaultColor = 'Negro';
          child.material = new THREE.MeshStandardMaterial({ color: PALETTES.knobs[defaultColor].hex, metalness: 0, roughness: 1 });
          newSelectable.faders.push(child);
          newChosenColors.faders[child.name] = defaultColor;
        } else {
          if (child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.color) {
              const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
              if (lightness < 0.8) {
                const defaultColor = 'Negro';
                mat.color.setHex(parseInt(PALETTES.knobs[defaultColor].hex.replace('#', ''), 16));
                newSelectable.faders.push(child);
                newChosenColors.faders[child.name] = defaultColor;
              }
            }
          }
        }
      }
    });

    setSelectable(newSelectable);
    setChosenColors(newChosenColors);
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

  // Abrir modal de pago y capturar imagen con vista frontal fija
  const handleOpenPayment = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    const originalPos = cameraRef.current.position.clone();
    const originalTarget = controlsRef.current ? controlsRef.current.target.clone() : null;
    const originalFov = cameraRef.current.fov;
    const initialPos = CAMERA_VIEWS.normal.pos.clone();
    const initialTarget = CAMERA_VIEWS.normal.target.clone();
    cameraRef.current.position.copy(initialPos);
    cameraRef.current.fov = 35;
    cameraRef.current.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialTarget);
      controlsRef.current.update();
    }
    setTimeout(() => {
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      const img = rendererRef.current!.domElement.toDataURL('image/png');
      setScreenshot(img);
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

  // Obtener título y colores según la vista
  const getTitle = () => {
    switch (currentView) {
      case 'chasis': return 'ELIGE EL COLOR DEL CHASIS';
      case 'buttons': return 'PERSONALIZA LOS BOTONES';
      case 'knobs': return 'ESCOGE PARA LOS KNOBS';
      case 'teclas': return 'PERSONALIZA LAS TECLAS';
      case 'faders': return 'PERSONALIZA LOS FADERS';
      default: return 'ELIGE UN COLOR';
    }
  };
  const getCurrentColors = () => PALETTES[currentView] || {};

  
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

  const particlesInit = async (main: any) => {
    await loadFull(main);
  };

  const menuIcons = [
    { id: 'normal', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z', title: 'Vista General' },
    { id: 'chasis', icon: './textures/beato16.png', title: 'Chasis', isImage: true },,
    { id: 'buttons', icon: 'M12 1.999c5.524 0 10.002 4.478 10.002 10.002c0 5.523-4.478 10.001-10.002 10.001S1.998 17.524 1.998 12.001C1.998 6.477 6.476 1.999 12 1.999m0 1.5a8.502 8.502 0 1 0 0 17.003A8.502 8.502 0 0 0 12 3.5M11.996 6a5.998 5.998 0 1 1 0 11.996a5.998 5.998 0 0 1 0-11.996', title: 'Botones' },
    { id: 'knobs', icon: 'M9.42 4.074a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56M11.554 8.8a.5.5 0 0 1 0 .707l-1.78 1.78a.5.5 0 1 1-.708-.707l1.78-1.78a.5.5 0 0 1 .708 0 M9.42 15.444c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.03 1.32-3.19 1.32m0-1.1a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82M6.757 5.2a.56.56 0 1 0-.965.567l.465.809l.005.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm5.315.012a.55.55 0 0 1 .761-.206c.277.152.36.5.203.764l-.458.797a.56.56 0 0 1-.478.277a.564.564 0 0 1-.487-.834zm7.598 5.722a.5.5 0 0 1 .5-.5h2.52a.5.5 0 1 1 0 1h-2.52a.5.5 0 0 1-.5-.5 M22.69 15.454c2.49 0 4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52s2.03 4.52 4.52 4.52m0-1.11a3.41 3.41 0 1 1 0-6.82a3.41 3.41 0 0 1 0 6.82m-.56-9.7c0-.308.252-.56.56-.56s.56.252.56.56v.945a.566.566 0 0 1-.56.535a.56.56 0 0 1-.56-.56zm-2.103.566a.557.557 0 0 0-.763-.202a.566.566 0 0 0-.204.753l.468.815l.004.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm6.086-.204a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759c.1.067.217.078.282.078a.6.6 0 0 0 .478-.262l.005-.006l.463-.806a.55.55 0 0 0-.203-.764M11.93 22.636H9.42a.5.5 0 0 0 0 1h2.51a.5.5 0 1 0 0-1 M4.9 23.136c0 2.49 2.03 4.52 4.52 4.52s4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52m7.93 0a3.41 3.41 0 1 1-6.82 0a3.41 3.41 0 0 1 6.82 0m-3.41-6.86a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56m-3.418.93a.566.566 0 0 1 .755.206l.464.807c.137.258.06.6-.205.753a.53.53 0 0 1-.276.074a.58.58 0 0 1-.478-.261l-.005-.007l-.468-.814a.566.566 0 0 1 .207-.755zm6.08.209a.55.55 0 0 1 .761-.206c.277.151.36.499.203.764l-.462.802a.567.567 0 0 1-.766.194a.55.55 0 0 1-.194-.76zm8.475 3.588a.5.5 0 0 1 .707 0l1.78 1.78a.5.5 0 0 1-.707.707l-1.78-1.78a.5.5 0 0 1 0-.707 M22.69 27.656c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.04 1.32-3.19 1.32m0-1.11a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82 M22.13 16.836c0-.308.252-.56.56-.56s.56.252.56.56v.945a.57.57 0 0 1-.56.545a.56.56 0 0 1-.56-.56zm-2.103.576a.566.566 0 0 0-.755-.206l-.006.003a.565.565 0 0 0-.206.755l.468.814l.004.007a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.074a.566.566 0 0 0 .205-.753zm6.086-.203a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M1 5.75A4.75 4.75 0 0 1 5.75 1h20.52a4.75 4.75 0 0 1 4.75 4.75v20.48a4.75 4.75 0 0 1-4.75 4.75H5.75A4.75 4.75 0 0 1 1 26.23zM5.75 3A2.75 2.75 0 0 0 3 5.75v20.48a2.75 2.75 0 0 0 2.75 2.75h20.52a2.75 2.75 0 0 0 2.75-2.75V5.75A2.75 2.75 0 0 0 26.27 3z', title: 'Knobs' },
    { id: 'teclas', icon: 'M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6zm3-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H6zm2 2h8v4H8V8z', title: 'Teclas' },
    { id: 'faders', icon: 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z', title: 'Faders' }
  ];

  // AVISO: El 'amount' aquí es solo para visualización. El precio REAL
  // debe ser calculado en tu backend.
  const [payuData, setPayuData] = useState({
    referenceCode: 'controlador123',
    amount: '185.00', // Este valor NO debe usarse para el pago final
    currency: 'USD',
    signature: '',
  });

  useEffect(() => {
    async function updateSignature() {
      const signature = await getPayuSignature({ referenceCode: payuData.referenceCode, amount: payuData.amount, currency: payuData.currency, });
      setPayuData(prev => ({ ...prev, signature }));
    }
    updateSignature();
  }, [payuData.referenceCode, payuData.amount, payuData.currency]);

  useEffect(() => {
    if (showCartModal || showPaymentModal) {
      const uniqueRef = `beato16-${Date.now()}`;
      setPayuData(prev => ({ ...prev, referenceCode: uniqueRef }));
    }
  }, [showCartModal, showPaymentModal]);

  const PAYPAL_CLIENT_ID = "sb"; // Cambia por tu clientId real en producción

  const [sidebarFiles, setSidebarFiles] = useState<File[]>([]);
  const handleSidebarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSidebarFiles(Array.from(e.target.files));
  };
    
  // ==================================================================
  // INICIO CORRECCIÓN DE SEGURIDAD PARA PAGOS
  // ==================================================================

  /**
   * Llama al backend para crear una orden de pago segura.
   * @returns {Promise<string>} El ID de la orden de PayPal.
   */
  const createPaypalOrderOnServer = async (): Promise<string> => {
    try {
      const response = await fetch('http://localhost:4000/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customization: chosenColors }),
      });
      if (!response.ok) throw new Error('Error en el servidor al crear la orden.');
      const order = await response.json();
      return order.id;
    } catch (error) {
      console.error("Error al crear la orden de PayPal:", error);
      alert("No se pudo iniciar el pago. Inténtalo de nuevo.");
      return Promise.reject(error);
    }
  };

  /**
   * Llama al backend para verificar que el pago se completó correctamente.
   * @param {string} orderID - El ID de la orden de PayPal.
   * @returns {Promise<boolean>} Verdadero si el pago fue verificado.
   */
  const verifyPaypalPaymentOnServer = async (orderID: string, paymentMethod: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:4000/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID, paymentMethod, customization: chosenColors, screenshot }),
      });
      if (!response.ok) throw new Error('La verificación del pago falló en el servidor.');
      console.log("Pago verificado exitosamente por el servidor.");
      return true;
    } catch (error) {
      console.error("Error en la verificación del pago:", error);
      alert("Hubo un problema al verificar tu pago. Por favor, contacta a soporte.");
      return false;
    }
  };
  // ==================================================================
  // FIN CORRECCIÓN DE SEGURIDAD PARA PAGOS
  // ==================================================================

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
      <div className="w-full h-screen bg-black text-gray-200 overflow-hidden relative">
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none", background: "linear-gradient(120deg,rgb(42, 40, 51) 0%, #00FFF0 60%, #D8D6F2 100%)" }} />
        <Particles id="tsparticles" init={particlesInit} options={{ fullScreen: { enable: false }, background: { color: { value: "transparent" } }, fpsLimit: 60, particles: { color: { value: "#a259ff" }, links: { enable: true, color: "#a259ff", distance: 120 }, move: { enable: true, speed: 1 }, number: { value: 50 }, opacity: { value: 0.5 }, shape: { type: "circle" }, size: { value: 3 } }, interactivity: { events: { onhover: { enable: true, mode: "repulse" } }, modes: { repulse: { distance: 100, duration: 0.4 } } } }} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }} />
        
        <div style={{ position: 'fixed', top: 16, left: 6, zIndex: 51, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => window.location.href = 'https://www.crearttech.com/'}
            className="relative px-5 py-2 rounded-full font-bold text-sm uppercase tracking-wider text-white transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(90deg, rgba(0,255,255,0.18) 0%, rgba(122,0,255,0.18) 50%, rgba(255,0,255,0.18) 100%)',
              border: '1px solid rgba(0, 255, 255, 0.55)'
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Inicio</span>
            </span>
          </button>
        </div>

        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
          <img src="models/logo.png" alt="Logo" className="h-8 w-auto" style={{ filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)' }} />
          <h1 className="text-2xl font-bold leading-none m-0" style={{ fontFamily: 'Gotham Black, Arial, sans-serif', color: '#fff', textShadow: '0 0 12px #a259ff, 0 0 24px #0ff, 0 0 2px #fff', letterSpacing: '0.04em' }}>BEATO16</h1>
        </div>

        <main className="flex w-full h-full" style={{ minHeight: "100vh", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden" }}>
          <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1, background: "linear-gradient(180deg,rgb(5, 1, 73) 0%,rgb(82, 2, 46) 100%)" }}>
            <div ref={mountRef} className="w-full h-full transition-all duration-300" onClick={handleCanvasClick} style={{ position: "relative", zIndex: 1 }} />
          </div>
        </main>

        <div className={`fixed top-0 right-0 h-screen border-l border-gray-700 shadow-2xl transition-all duration-400 flex overflow-hidden z-10 ${currentView === 'normal' ? 'w-28' : 'w-[320px]'}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(26, 26, 26, 0.2) 25%, rgba(10, 10, 10, 0.2) 50%, rgba(26, 26, 26, 0.2) 75%, rgba(0, 0, 0, 0.2) 100%)', boxShadow: '0 0 16px 2px rgba(0, 255, 255, 0.4), -6px 0 16px 0 rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0,0,0,0.8)', borderLeft: '2px solid rgba(0, 255, 255, 0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <div className="w-28 p-4 flex-shrink-0" style={{ paddingTop: '45px' }}>
            <div className="flex flex-col gap-1.5">
              {menuIcons.map((item) => (
                <button key={item.id} onClick={() => changeView(item.id as any)} className={`w-full aspect-square border-2 rounded-lg flex items-center justify-center p-2 transition-all duration-300 text-white relative ${currentView === item.id ? 'bg-gradient-to-br from-[#00FFFF] to-[#0080FF] border-[#00FFFF] shadow-lg' : 'border-[#00FFFF] bg-gradient-to-br from-[#000000] to-[#1a1a1a] hover:from-[#00FFFF] hover:to-[#0080FF] hover:border-[#00FFFF] hover:shadow-lg'}`} title={item.title}>
                  {item.isImage ? (
                    <img src={item.icon} alt={item.title} className="w-full h-full mx-auto my-auto object-contain" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox={item.id === 'chasis' ? '0 0 32 32' : item.id === 'knobs' ? '0 0 32 32' : item.id === 'faders' ? '0 0 24 24' : '0 0 24 24'} className="w-4/5 h-4/5 mx-auto my-auto fill-white text-white" fill="#fff"><path d={item.icon} /></svg>
                  )}
                </button>
              ))}
              <input id="sidebar-upload" type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleSidebarFileChange} />
              <button type="button" onClick={() => document.getElementById('sidebar-upload')?.click()} className="w-full aspect-square border-2 rounded-lg flex items-center justify-center p-2 transition-all duration-300 text-white bg-gradient-to-br from-[#000000] to-[#1a1a1a] border-[#00FFFF] hover:from-[#00FFFF] hover:to-[#0080FF] hover:border-[#00FFFF] hover:shadow-lg" title="Subir archivos de personalización">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {sidebarFiles.length > 0 && (<span className="text-xs text-white mt-2">Archivos: {sidebarFiles.map(f => f.name).join(', ')}</span>)}
            </div>
          </div>
          <div className="flex-1 p-2 flex flex-col">
            <div className={`flex items-center pb-5 border-b border-gray-600 pl-0 ${currentView === 'normal' ? 'justify-center items-center gap-0' : 'justify-center gap-2'}`} style={currentView === 'normal' ? { minHeight: '48px' } : {}}>
              {currentView !== 'normal' && <img src="models/logo.png" alt="Logo" className="h-8 w-auto" style={{ filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)' }} />}
            </div>
            <div className="mt-6 animate-fadeIn">
              <p className="font-black text-sm tracking-wide uppercase m-0 mb-3 text-gray-200 text-left animate-fadeIn">{getTitle()}</p>
              <div className="grid grid-cols-2 gap-x-0 gap-y-0 p-0 justify-items-end ml-auto animate-scaleIn">
                {Object.entries(getCurrentColors()).map(([name, colorData], index) => (
                  <div key={name} className="w-10 h-10 rounded-full cursor-pointer border border-[#a259ff] shadow-[0_0_6px_1px_#a259ff55] transition-all duration-200 hover:scale-110 animate-fadeInUp" style={{ backgroundColor: colorData.hex, animationDelay: `${index * 50}ms` }} title={name} onClick={() => applyColor(name, colorData)} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {currentView === 'normal' && (
          <button onClick={handleAddToCart} className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duration-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]">AÑADIR AL CARRITO</button>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative bg-[#3a4060] rounded-2xl shadow-2xl border-2 border-[#a259ff] p-4 md:py-4 md:px-8 w-full max-w-4xl mx-4 animate-fade-in">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-pink-400 text-2xl font-bold">×</button>
              <h2 className="text-3xl md:text-4xl font-bold text-purple-400 mb-4 text-center tracking-widest">PAGO SEGURO</h2>
              <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                <div className="w-full max-w-[320px] md:max-w-[380px] aspect-[4/3] flex items-center justify-center ml-16 md:ml-24">
                  {screenshot && (<img src={screenshot} alt="Controlador personalizado" className="w-full h-full object-contain" style={{ background: 'none', boxShadow: 'none', border: 'none' }} />)}
                </div>
                <div className="flex-1 mt-8 md:mt-0">
                  <h3 className="text-xl font-semibold mb-2 text-cyan-400">Tu configuración:</h3>
                  <ul className="text-base space-y-1">
                    <li><b>Chasis:</b> {chosenColors.chasis}</li>
                    <li><b>Botones:</b> {Object.values(chosenColors.buttons).join(', ') || 'Por defecto'}</li>
                    <li><b>Perillas:</b> {Object.values(chosenColors.knobs).join(', ') || 'Por defecto'}</li>
                    <li><b>Teclas:</b> {Object.values(chosenColors.teclas).join(', ') || 'Por defecto'}</li>
                    <li><b>Faders:</b> {Object.values(chosenColors.faders).join(', ') || 'Por defecto'}</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                <PayPalButtons style={{ layout: "horizontal", color: "blue", shape: "rect", label: "paypal", height: 48 }} createOrder={createPaypalOrderOnServer} onApprove={async (data) => {
                  const isVerified = await verifyPaypalPaymentOnServer(data.orderID, 'PayPal');
                  if (isVerified) {
                    alert("¡Pago verificado y completado! Recibirás un correo de confirmación.");
                    setShowPaymentModal(false);
                  }
                }} onError={(err) => alert("Error en el pago con PayPal: " + err)} />
                <form action="https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/" method="post" target="_blank" className="w-full flex flex-col items-center">
                  <input type="hidden" name="merchantId" value="508029" />
                  <input type="hidden" name="accountId" value="512321" />
                  <input type="hidden" name="description" value="Controlador MIDI personalizado" />
                  <input type="hidden" name="referenceCode" value={payuData.referenceCode} />
                  <input type="hidden" name="amount" value={payuData.amount} />
                  <input type="hidden" name="currency" value={payuData.currency} />
                  <input type="hidden" name="signature" value={payuData.signature} />
                  <input type="hidden" name="test" value="1" />
                  <button type="submit" className="w-full py-3 rounded-lg bg-gradient-to-r from-green-400 to-cyan-400 text-white font-bold text-lg shadow-[0_0_12px_2px_#0ff580] hover:scale-105 transition-all mt-2">Pagar con PayU</button>
                </form>
              </div>
              <p className="text-xs text-gray-400 mt-6 text-center">Tu compra es 100% segura y protegida.</p>
            </div>
          </div>
        )}

        {showCartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative bg-[#232846] rounded-2xl shadow-2xl border-2 border-[#a259ff] p-6 w-full max-w-2xl mx-4 animate-fade-in flex flex-col items-center">
              <button onClick={() => setShowCartModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-pink-400 text-2xl font-bold">×</button>
              <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-4 text-center tracking-widest">¡Producto Añadido!</h2>
              <p className="text-white text-center mb-4">Tu configuración se ha añadido al carrito de Wix. Puedes finalizar tu compra desde allí.</p>
              <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                <div className="w-full max-w-[220px] aspect-[4/3] flex items-center justify-center">
                  {screenshot && (<img src={screenshot} alt="Controlador personalizado" className="w-full h-full object-contain" style={{ background: 'none', boxShadow: 'none', border: 'none' }} />)}
                </div>
                <div className="flex-1 mt-4 md:mt-0 w-full">
                  <h3 className="text-lg font-semibold mb-2 text-cyan-400">Tu producto:</h3>
                  <ul className="text-base space-y-1 mb-2">
                    <li><b>Chasis:</b> {chosenColors.chasis}</li>
                    <li><b>Botones:</b> {Object.values(chosenColors.buttons).join(', ') || 'Por defecto'}</li>
                    <li><b>Perillas:</b> {Object.values(chosenColors.knobs).join(', ') || 'Por defecto'}</li>
                    <li><b>Teclas:</b> {Object.values(chosenColors.teclas).join(', ') || 'Por defecto'}</li>
                    <li><b>Faders:</b> {Object.values(chosenColors.faders).join(', ') || 'Por defecto'}</li>
                  </ul>
                  {/* El precio ahora lo determina Wix */}
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6 w-full">
                <button onClick={() => setShowCartModal(false)} className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-[0_0_12px_2px_#ff00ff80] hover:scale-105 transition-all mt-2">Seguir Personalizando</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default Beato16Configurator;