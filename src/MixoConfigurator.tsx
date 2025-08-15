import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { getPayuSignature } from './api';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import type { ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import Swal from 'sweetalert2';

// PayPal Client ID
const PAYPAL_CLIENT_ID = "test";

// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  buttons: THREE.Mesh[];
  knobs: THREE.Mesh[];
  faders: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  buttons: Record<string, string>;
  knobs: Record<string, string>;
  faders: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  buttons: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
  faders: Record<string, PaletteColor>;
}

const MixoConfigurator: React.FC<{ onProductChange?: (product: 'beato' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {
  // Estado para la firma PayU y referencia
  const [payuSignature, setPayuSignature] = useState("");
  const [payuReference, setPayuReference] = useState("");

  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const modelOriginalPositionRef = useRef<THREE.Vector3 | null>(null);

  // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('mixo_chosenColors');
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
      faders: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], buttons: [], knobs: [], faders: [] });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Ref para guardar el estado anterior de currentView
  const prevViewRef = useRef<'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders'>(currentView);

  // Estado para selección múltiple de botones
  const [selectedButtons, setSelectedButtons] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de knobs
  const [selectedKnobs, setSelectedKnobs] = useState<THREE.Mesh[]>([]);

  // Estado para selección múltiple de faders
  const [selectedFaders, setSelectedFaders] = useState<THREE.Mesh[]>([]);

  // Estado para los tooltips de los botones
  const [showChasisTooltip, setShowChasisTooltip] = useState(false);
  const [showKnobsTooltip, setShowKnobsTooltip] = useState(false);
  const [showFadersTooltip, setShowFadersTooltip] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Configuración de paletas
  const PALETTES: Palettes = {
    chasis: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    buttons: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    knobs: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, },
    faders: { 'Verde': { hex: '#7CBA40' }, 'Amarillo': { hex: '#F3E600' }, 'Azul': { hex: '#325EB7' }, 'Blanco': { hex: '#F5F5F5' }, 'Naranja': { hex: '#F47119' }, 'Morado': { hex: '#7B217E' }, 'Rojo': { hex: '#E52421' }, 'Negro': { hex: '#1C1C1C' }, 'Rosa': { hex: '#FF007F' }, 'Gris': { hex: '#808080' }, }
  };

  // Configuración de vistas de cámara
  const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1, -0.1), target: new THREE.Vector3(0, -0.5, -0.1) },
    top:    { pos: new THREE.Vector3(1, 1.95, -0.4), target: new THREE.Vector3(-0.35, -1.4, -0.4) },
  };

  // ==================================================================
  // INICIO DE LAS FUNCIONES DE PAGO SEGURO
  // ==================================================================
  
  /**
   * Llama al backend para crear una orden de pago segura en PayPal.
   * El backend calcula el precio correcto y devuelve un ID de orden.
   */
  const createPaypalOrderOnServer = async (): Promise<string> => {
    try {
      const response = await fetch('http://localhost:4000/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envía la configuración para que el backend calcule el precio.
        body: JSON.stringify({ customization: chosenColors }),
      });
      if (!response.ok) throw new Error('Error en el servidor al crear la orden.');
      const order = await response.json();
      return order.id; // Devuelve solo el ID de la orden.
    } catch (error) {
      console.error("Error al crear la orden de PayPal:", error);
      alert("No se pudo iniciar el pago. Inténtalo de nuevo.");
      return Promise.reject(error);
    }
  };

  /**
   * Llama al backend para que verifique la transacción con la API de PayPal.
   */
  const verifyPaypalPaymentOnServer = async (orderID: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:4000/api/verify-paypal-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envía el ID de la orden para que el servidor la verifique.
        body: JSON.stringify({ orderID, customization: chosenColors, screenshot }),
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
  // FIN DE LAS FUNCIONES DE PAGO SEGURO
  // ==================================================================

  // Función para abrir el modal de pago
  const handleOpenPayment = useCallback(() => {
    // Guardar posición y configuración actual de la cámara
    const originalPos = cameraRef.current?.position.clone();
    const originalTarget = controlsRef.current?.target.clone();
    const originalFov = cameraRef.current?.fov;

    // Mover a la posición inicial (frontal) - usar la vista normal mejorada
    const initialPos = CAMERA_VIEWS.normal.pos.clone();
    const initialTarget = CAMERA_VIEWS.normal.target.clone();
    cameraRef.current!.position.copy(initialPos);
    cameraRef.current!.fov = 35; // FOV ligeramente más amplio para mejor vista
    cameraRef.current!.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialTarget);
      controlsRef.current.update();
    }

    setTimeout(() => {
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      const img = rendererRef.current!.domElement.toDataURL('image/png');
      setScreenshot(img);

      // Restaurar posición, target y FOV originales
      cameraRef.current!.position.copy(originalPos!);
      cameraRef.current!.fov = originalFov!;
      cameraRef.current!.updateProjectionMatrix();
      if (controlsRef.current && originalTarget) {
        controlsRef.current.target.copy(originalTarget);
        controlsRef.current.update();
      }
      setShowPaymentModal(true);
    }, 50);
  }, [rendererRef, sceneRef, cameraRef, controlsRef, CAMERA_VIEWS, setScreenshot, setShowPaymentModal]);

  // Referencias para la posición inicial de la cámara
  const initialCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraTargetRef = useRef<THREE.Vector3 | null>(null);

  // Guardar configuraciones en localStorage
  useEffect(() => {
    localStorage.setItem('mixo_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('mixo_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Asegurar que el modal de pago esté cerrado al cargar
  useEffect(() => {
    setShowPaymentModal(false);
    console.log('MixoConfigurator: Modal cerrado al cargar, showPaymentModal:', false);
  }, []);

  // Log para monitorear cambios en showPaymentModal
  useEffect(() => {
    console.log('MixoConfigurator: showPaymentModal cambió a:', showPaymentModal);
  }, [showPaymentModal]);

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

  // Función para centrar y escalar el modelo
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

  // 3. Al cargar el modelo, aplicar el envMap y MeshPhysicalMaterial
  const prepareModelParts = useCallback((model: THREE.Group) => {
    const newSelectable: Selectable = { chasis: [], buttons: [], knobs: [], faders: [] };
    const newChosenColors: ChosenColors = { type: 'configUpdate', chasis: 'Gris', buttons: {}, knobs: {}, faders: {} };

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';

      if (meshName.includes('logo') || meshName.includes('mixo') || meshName.includes('knobo02') || meshName.includes('knobo-02') || meshName.includes('crearttech') || meshName.includes('custom midi')) {
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
        const defaultColor = 'Amarillo';
        child.material = new THREE.MeshPhysicalMaterial({ color: PALETTES.buttons[defaultColor].hex, metalness: 0.0, roughness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.0, reflectivity: 1.0, transmission: 0.0, thickness: 0.3, ior: 1.5, attenuationDistance: 0.5, attenuationColor: 0xFFFF00, transparent: false, opacity: 1.0, emissive: 0xFFFF00, emissiveIntensity: 3.0 });
        newSelectable.buttons.push(child);
        newChosenColors.buttons[child.name] = defaultColor;
      }
      else if (meshName.includes('aro')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, reflectivity: 0.5, transmission: 0.3, thickness: 0.5, ior: 1.4, attenuationDistance: 1.0, attenuationColor: 0xffffff, transparent: true, opacity: 0.7 });
        newSelectable.buttons.push(child);
        newChosenColors.buttons[child.name] = 'Negro';
      }
      else if (meshName.startsWith('knob1_') || meshName.startsWith('knob2_') || meshName.startsWith('knob3_') || meshName.startsWith('knob4_')) {
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
      else if (meshName.includes('fader')) {
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

  // Función para restaurar el brillo LED original de un botón
  const restoreButtonLED = useCallback((button: THREE.Mesh) => {
    if (button.material instanceof THREE.MeshPhysicalMaterial) {
      const material = button.material;
      const colorName = chosenColors.buttons[button.name];
      if (colorName && PALETTES.buttons[colorName]) {
        const colorHex = PALETTES.buttons[colorName].hex;
        material.emissive.setHex(parseInt(colorHex.replace('#', ''), 16));
        material.emissiveIntensity = 3.0;
      }
    }
  }, [chosenColors, PALETTES]);

  // Cargar modelo
  const loadModel = useCallback(async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
      loader.load('./models/mixo.glb', (gltf: any) => {
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

  // Función para establecer emisivo (glow effect)
  const setEmissive = useCallback((object: THREE.Mesh | null, color: number = 0x000000) => {
    if (object && (object.material as THREE.MeshPhysicalMaterial)?.emissive) {
      const material = object.material as THREE.MeshPhysicalMaterial;
      
      if (object.name.toLowerCase().includes('boton') && color === 0x000000) {
        restoreButtonLED(object);
        return;
      }
      
      material.emissive.setHex(color);
      if (object.name.toLowerCase().includes('boton')) {
        material.emissiveIntensity = 3.0;
      }
      else if (object.name.toLowerCase().includes('aro')) {
        material.emissiveIntensity = 0.3;
        material.opacity = 0.8;
      }
    }
  }, [restoreButtonLED]);

  // Función para manejar clics en el canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!sceneRef.current || !cameraRef.current) return;

    if (currentView === 'chasis') {
      setSelectedForColoring(null);
      setSelectedButtons([]);
      setSelectedKnobs([]);
      setSelectedFaders([]);
      return;
    }

    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    
    let objectsToIntersect: THREE.Mesh[] = [];
    if (currentView === 'buttons') objectsToIntersect = selectable.buttons;
    else if (currentView === 'knobs') objectsToIntersect = selectable.knobs;
    else if (currentView === 'faders') objectsToIntersect = selectable.faders;
    else if (currentView === 'normal') objectsToIntersect = selectable.buttons;
    
    if (objectsToIntersect.length === 0) return;
    
    const intersects = raycaster.intersectObjects(objectsToIntersect, false);
    
    if (currentView === 'buttons') {
      selectable.buttons.forEach(btn => setEmissive(btn, 0x000000));
    }
    if (selectedForColoring && currentView !== 'normal') {
      setEmissive(selectedForColoring, 0x000000);
    }

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const name = clickedMesh.name.toLowerCase();

      if (currentView === 'normal') return;

      if (name.includes('boton') || name.includes('aro')) {
        setSelectedKnobs([]);
        setSelectedFaders([]);
        if (event.shiftKey) {
          if (selectedButtons.length === 0 && selectedForColoring && selectedForColoring !== clickedMesh) {
            setSelectedButtons([selectedForColoring, clickedMesh]);
            setSelectedForColoring(null);
            setEmissive(selectedForColoring, 0x444444);
            setEmissive(clickedMesh, 0x444444);
          } else {
            setSelectedForColoring(null);
            setSelectedButtons(prev => {
              if (prev.length === 0) { setEmissive(clickedMesh, 0x444444); return [clickedMesh]; }
              const already = prev.includes(clickedMesh);
              let newSelected;
              if (already) {
                newSelected = prev.filter(obj => obj !== clickedMesh);
                setEmissive(clickedMesh, 0x000000);
              } else {
                newSelected = [...prev, clickedMesh];
                setEmissive(clickedMesh, 0x444444);
              }
              newSelected.forEach(btn => setEmissive(btn, 0x444444));
              return newSelected;
            });
          }
        } else {
          setSelectedButtons([clickedMesh]);
          setSelectedForColoring(clickedMesh);
          setEmissive(clickedMesh, 0x444444);
        }
      } else if (name.startsWith('knob1_') || name.startsWith('knob2_') || name.startsWith('knob3_') || name.startsWith('knob4_')) {
        setSelectedButtons([]);
        setSelectedFaders([]);
        if (event.shiftKey) {
          if (selectedKnobs.length === 0 && selectedForColoring && selectedForColoring !== clickedMesh) {
            setSelectedKnobs([selectedForColoring, clickedMesh]);
            setSelectedForColoring(null);
            setEmissive(selectedForColoring, 0x444444);
            setEmissive(clickedMesh, 0x444444);
          } else {
            setSelectedForColoring(null);
            setSelectedKnobs(prev => {
              if (prev.length === 0) { setEmissive(clickedMesh, 0x444444); return [clickedMesh]; }
              const already = prev.includes(clickedMesh);
              let newSelected;
              if (already) {
                newSelected = prev.filter(obj => obj !== clickedMesh);
                setEmissive(clickedMesh, 0x000000);
              } else {
                newSelected = [...prev, clickedMesh];
                setEmissive(clickedMesh, 0x444444);
              }
              newSelected.forEach(knob => setEmissive(knob, 0x444444));
              return newSelected;
            });
          }
        } else {
          setSelectedKnobs([clickedMesh]);
          setSelectedForColoring(clickedMesh);
          setEmissive(clickedMesh, 0x444444);
        }
      } else if (name.startsWith('fader1') || name.startsWith('fader2') || name.startsWith('fader3') || name.startsWith('fader4')) {
        setSelectedButtons([]);
        setSelectedKnobs([]);
        if (event.shiftKey) {
          if (selectedFaders.length === 0 && selectedForColoring && selectedForColoring !== clickedMesh) {
            setSelectedFaders([selectedForColoring, clickedMesh]);
            setSelectedForColoring(null);
            setEmissive(selectedForColoring, 0x444444);
            setEmissive(clickedMesh, 0x444444);
          } else {
            setSelectedForColoring(null);
            setSelectedFaders(prev => {
              if (prev.length === 0) { setEmissive(clickedMesh, 0x444444); return [clickedMesh]; }
              const already = prev.includes(clickedMesh);
              let newSelected;
              if (already) {
                newSelected = prev.filter(obj => obj !== clickedMesh);
                setEmissive(clickedMesh, 0x000000);
              } else {
                newSelected = [...prev, clickedMesh];
                setEmissive(clickedMesh, 0x444444);
              }
              newSelected.forEach(fader => setEmissive(fader, 0x444444));
              return newSelected;
            });
          }
        } else {
          setSelectedFaders([clickedMesh]);
          setSelectedForColoring(clickedMesh);
          setEmissive(clickedMesh, 0x444444);
        }
      } else if (name.includes('cubechasis')) {
        setSelectedButtons([]);
        setSelectedKnobs([]);
        setSelectedFaders([]);
        setSelectedForColoring(clickedMesh);
      }
    }
  }, [currentView, selectable, selectedForColoring, setEmissive, selectedButtons, selectedKnobs, selectedFaders]);

  // Función para aplicar color
  const applyColor = useCallback((colorName: string, colorData: PaletteColor) => {
    if (currentView === 'chasis') {
      selectable.chasis.forEach(mesh => { (mesh.material as THREE.MeshStandardMaterial).color.set(colorData.hex); });
      setChosenColors(prev => ({ ...prev, chasis: colorName }));
      return;
    }

    if (currentView === 'buttons' && selectedButtons.length > 0) {
      const newChosenColors = { ...chosenColors, buttons: { ...chosenColors.buttons } };
      selectedButtons.forEach(btn => {
        const material = btn.material as THREE.MeshPhysicalMaterial;
        material.color.set(colorData.hex);
        material.emissive.setHex(parseInt(colorData.hex.replace('#', ''), 16));
        newChosenColors.buttons[btn.name] = colorName;
        const aroName = btn.name.replace('boton', 'aro');
        const aroMesh = selectable.buttons.find(m => m.name === aroName);
        if (aroMesh && aroMesh.material instanceof THREE.MeshPhysicalMaterial) {
          const aroMaterial = aroMesh.material;
          aroMaterial.color.setHex(parseInt(colorData.hex.replace('#', ''), 16));
          aroMaterial.attenuationColor.setHex(parseInt(colorData.hex.replace('#', ''), 16));
          newChosenColors.buttons[aroName] = colorName;
        }
      });
      setChosenColors(newChosenColors);
      setSelectedButtons([]);
      return;
    }

    if (currentView === 'knobs' && selectedKnobs.length > 0) {
      const newChosenColors = { ...chosenColors, knobs: { ...chosenColors.knobs } };
      selectedKnobs.forEach(knob => {
        (knob.material as THREE.MeshStandardMaterial).color.set(colorData.hex);
        newChosenColors.knobs[knob.name] = colorName;
      });
      setChosenColors(newChosenColors);
      setSelectedKnobs([]);
      return;
    }

    if (currentView === 'faders' && selectedFaders.length > 0) {
      const newChosenColors = { ...chosenColors, faders: { ...chosenColors.faders } };
      selectedFaders.forEach(fader => {
        fader.material = new THREE.MeshStandardMaterial({ color: colorData.hex, metalness: 0, roughness: 1 });
        newChosenColors.faders[fader.name] = colorName;
      });
      setChosenColors(newChosenColors);
      setSelectedFaders([]);
      return;
    }

    if (!selectedForColoring) {
      Swal.fire({ title: 'Selecciona una parte', text: 'Haz clic en una pieza del controlador para aplicar el color.', imageUrl: 'models/logo.png', imageWidth: 120, imageHeight: 120, background: '#232846', color: '#fff', confirmButtonColor: '#a259ff', confirmButtonText: 'Entendido' });
      return;
    }

    const name = selectedForColoring.name.toLowerCase();
    const color = new THREE.Color(colorData.hex);

    if (name.includes('cubechasis')) {
      setChosenColors(prev => ({ ...prev, chasis: colorName }));
      if (selectedForColoring.material instanceof THREE.MeshStandardMaterial) {
        selectedForColoring.material.color = color;
      }
    } else if (name.includes('boton')) {
      setChosenColors(prev => ({ ...prev, buttons: { ...prev.buttons, [selectedForColoring.name]: colorName } }));
      if (selectedForColoring.material instanceof THREE.MeshPhysicalMaterial) {
        const material = selectedForColoring.material;
        material.color = color;
        material.emissive.setHex(parseInt(colorData.hex.replace('#', ''), 16));
        const aroName = selectedForColoring.name.replace('boton', 'aro');
        const aroMesh = selectable.buttons.find(m => m.name === aroName);
        if (aroMesh && aroMesh.material instanceof THREE.MeshPhysicalMaterial) {
          const aroMaterial = aroMesh.material;
          aroMaterial.color.setHex(parseInt(colorData.hex.replace('#', ''), 16));
          aroMaterial.attenuationColor.setHex(parseInt(colorData.hex.replace('#', ''), 16));
          setChosenColors(prev => ({ ...prev, buttons: { ...prev.buttons, [aroName]: colorName } }));
        }
      }
    } else if (name.startsWith('knob1_') || name.startsWith('knob2_') || name.startsWith('knob3_') || name.startsWith('knob4_')) {
      setChosenColors(prev => ({ ...prev, knobs: { ...prev.knobs, [selectedForColoring.name]: colorName } }));
      if (selectedForColoring.material && 'color' in selectedForColoring.material) {
        (selectedForColoring.material as any).color = color;
        (selectedForColoring.material as any).metalness = 0;
        (selectedForColoring.material as any).roughness = 1;
      }
    } else if (name.startsWith('fader1') || name.startsWith('fader2') || name.startsWith('fader3') || name.startsWith('fader4')) {
      setChosenColors(prev => ({ ...prev, faders: { ...prev.faders, [selectedForColoring.name]: colorName } }));
      selectedForColoring.material = new THREE.MeshStandardMaterial({ color: colorData.hex, metalness: 0, roughness: 1 });
    }
  }, [selectedForColoring, selectedButtons, selectedKnobs, selectedFaders, chosenColors, selectable, currentView, setEmissive]);

  // Función para obtener el título
  const getTitle = () => {
    switch (currentView) {
      case 'chasis': return 'ELIGE EL COLOR DEL CHASIS';
      case 'buttons': return 'PERSONALIZA LOS BOTONES';
      case 'knobs': return 'PERSONALIZA LOS KNOBS';
      case 'faders': return 'PERSONALIZA LOS FADERS';
      default: return 'ELIGE UN COLOR';
    }
  };

  // Función para obtener colores actuales
  const getCurrentColors = () => {
    switch (currentView) {
      case 'chasis': return PALETTES.chasis;
      case 'buttons': return PALETTES.buttons;
      case 'knobs': return PALETTES.knobs;
      case 'faders': return PALETTES.faders;
      default: return {};
    }
  };

  // Función para cambiar vista
  const changeView = useCallback((viewName: 'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders') => {
    setCurrentView(viewName);
    if (selectedForColoring) setEmissive(selectedForColoring, 0x000000);
    selectedButtons.forEach(btn => setEmissive(btn, 0x000000));
    selectedKnobs.forEach(knob => setEmissive(knob, 0x000000));
    selectedFaders.forEach(fader => setEmissive(fader, 0x000000));

    if (viewName === 'chasis' && selectable.chasis.length > 0) {
      setSelectedForColoring(selectable.chasis[0]);
    } else {
      setSelectedForColoring(null);
    }

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

    gsap.to(cameraRef.current.position, { duration: 1.2, ease: 'power3.inOut', ...targetView.pos });
    gsap.to(controlsRef.current.target, { duration: 1.2, ease: 'power3.inOut', ...targetView.target, onUpdate: () => controlsRef.current.update() });
  }, [selectable, selectedForColoring, setEmissive, selectedButtons, selectedKnobs, selectedFaders]);

  // Actualizar la referencia de la vista anterior
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
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 200);
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    cameraRef.current = camera;
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(CAMERA_VIEWS.normal.target);
      controls.enableDamping = true;
      controlsRef.current = controls;
    });
    setupProfessionalLighting(scene, renderer);
    loadModel();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [setupProfessionalLighting, loadModel]);

  // Efecto para aplicar colores cuando cambien
  useEffect(() => {
    if (!modelRef.current) return;
    if (selectable.chasis.length > 0) {
      const chasisColor = PALETTES.chasis[chosenColors.chasis];
      if (chasisColor) {
        selectable.chasis.forEach((mesh: THREE.Mesh) => {
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color = new THREE.Color(chasisColor.hex);
          }
        });
      }
      Object.entries(chosenColors.buttons).forEach(([buttonName, colorName]) => {
        const mesh = selectable.buttons.find(m => m.name === buttonName);
        if (mesh && PALETTES.buttons[colorName]) {
          if (mesh.material instanceof THREE.MeshPhysicalMaterial) {
            const material = mesh.material;
            material.color = new THREE.Color(PALETTES.buttons[colorName].hex);
            if (mesh.name.toLowerCase().includes('boton')) {
              material.emissive.setHex(parseInt(PALETTES.buttons[colorName].hex.replace('#', ''), 16));
              material.attenuationColor.setHex(parseInt(PALETTES.buttons[colorName].hex.replace('#', ''), 16));
            } else if (mesh.name.toLowerCase().includes('aro')) {
              material.attenuationColor.setHex(parseInt(PALETTES.buttons[colorName].hex.replace('#', ''), 16));
            }
          }
        }
      });
      Object.entries(chosenColors.faders).forEach(([faderName, colorName]) => {
        const mesh = selectable.faders.find(m => m.name === faderName);
        if (mesh && PALETTES.faders[colorName]) {
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color = new THREE.Color(PALETTES.faders[colorName].hex);
          }
        }
      });
    }
  }, [chosenColors, PALETTES, selectable]);

  const menuIcons = [
    { id: 'normal', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z', title: 'Vista General' },
    { id: 'chasis', icon: 'mixo.png', title: 'Chasis', isImage: true },
    { id: 'buttons', icon: 'M12 1.999c5.524 0 10.002 4.478 10.002 10.002c0 5.523-4.478 10.001-10.002 10.001S1.998 17.524 1.998 12.001C1.998 6.477 6.476 1.999 12 1.999m0 1.5a8.502 8.502 0 1 0 0 17.003A8.502 8.502 0 0 0 12 3.5M11.996 6a5.998 5.998 0 1 1 0 11.996a5.998 5.998 0 0 1 0-11.996', title: 'Botones' },
    { id: 'knobs', icon: 'M9.42 4.074a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56M11.554 8.8a.5.5 0 0 1 0 .707l-1.78 1.78a.5.5 0 1 1-.708-.707l1.78-1.78a.5.5 0 0 1 .708 0 M9.42 15.444c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.03 1.32-3.19 1.32m0-1.1a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82M6.757 5.2a.56.56 0 1 0-.965.567l.465.809l.005.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm5.315.012a.55.55 0 0 1 .761-.206c.277.152.36.5.203.764l-.458.797a.56.56 0 0 1-.478.277a.564.564 0 0 1-.487-.834zm7.598 5.722a.5.5 0 0 1 .5-.5h2.52a.5.5 0 1 1 0 1h-2.52a.5.5 0 0 1-.5-.5 M22.69 15.454c2.49 0 4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52s2.03 4.52 4.52 4.52m0-1.11a3.41 3.41 0 1 1 0-6.82a3.41 3.41 0 0 1 0 6.82m-.56-9.7c0-.308.252-.56.56-.56s.56.252.56.56v.945a.566.566 0 0 1-.56.535a.56.56 0 0 1-.56-.56zm-2.103.566a.557.557 0 0 0-.763-.202a.566.566 0 0 0-.204.753l.468.815l.004.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm6.086-.204a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M11.93 22.636H9.42a.5.5 0 0 0 0 1h2.51a.5.5 0 1 0 0-1 M4.9 23.136c0 2.49 2.03 4.52 4.52 4.52s4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52m7.93 0a3.41 3.41 0 1 1-6.82 0a3.41 3.41 0 0 1 6.82 0m-3.41-6.86a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56m-3.418.93a.566.566 0 0 1 .755.206l.464.807c.137.258.06.6-.205.753a.53.53 0 0 1-.276.074a.58.58 0 0 1-.478-.261l-.005-.007l-.468-.814a.566.566 0 0 1 .207-.755zm6.08.209a.55.55 0 0 1 .761-.206c.277.151.36.499.203.764l-.462.802a.567.567 0 0 1-.766.194a.55.55 0 0 1-.194-.76zm8.475 3.588a.5.5 0 0 1 .707 0l1.78 1.78a.5.5 0 0 1-.707.707l-1.78-1.78a.5.5 0 0 1 0-.707 M22.69 27.656c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.04 1.32-3.19 1.32m0-1.11a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82 M22.13 16.836c0-.308.252-.56.56-.56s.56.252.56.56v.945a.57.57 0 0 1-.56.545a.56.56 0 0 1-.56-.56zm-2.103.576a.566.566 0 0 0-.755-.206l-.006.003a.565.565 0 0 0-.206.755l.468.814l.004.007a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.074a.566.566 0 0 0 .205-.753z', title: 'Knobs' },
    { id: 'faders', icon: 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z', title: 'Faders' }
  ];

  const [payuData, setPayuData] = useState({
    referenceCode: 'controlador123',
    amount: '185.00',
    currency: 'USD',
    signature: '',
  });

  useEffect(() => {
    async function updateSignature() {
      const signature = await getPayuSignature({
        referenceCode: payuData.referenceCode,
        amount: payuData.amount,
        currency: payuData.currency,
      });
      setPayuData(prev => ({ ...prev, signature }));
    }
    updateSignature();
  }, [payuData.referenceCode, payuData.amount, payuData.currency]);

  const [sidebarFiles, setSidebarFiles] = useState<File[]>([]);
  const handleSidebarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSidebarFiles(Array.from(e.target.files));
    }
  };

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
          <img src="models/logo.png" alt="Logo" className="h-8 w-auto" />
          <h1 className="text-2xl font-bold leading-none m-0" style={{ fontFamily: 'Gotham Black, Arial, sans-serif', color: '#fff', letterSpacing: '0.04em' }}>MIXO</h1>
        </div>
        <main className="flex w-full h-full" style={{ minHeight: "100vh", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden" }}>
          <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1, background: "linear-gradient(180deg,rgb(5, 1, 73) 0%,rgb(82, 2, 46) 100%)" }}>
            <div ref={mountRef} className="w-full h-full transition-all duration-300" onClick={handleCanvasClick} style={{ position: "relative", zIndex: 1 }} />
            {currentView === 'normal' && (<button onClick={handleOpenPayment} className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duration-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl">AÑADIR AL CARRITO</button>)}
          </div>
        </main>
                <div className={`fixed top-0 right-0 h-screen border-l border-gray-700 shadow-2xl transition-all duration-400 flex overflow-hidden z-10 ${currentView === 'normal' ? 'w-28' : 'w-[320px]'}`} style={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(26, 26, 26, 0.2) 25%, rgba(10, 10, 10, 0.2) 50%, rgba(26, 26, 26, 0.2) 75%, rgba(0, 0, 0, 0.2) 100%)',
          boxShadow: '0 0 16px 2px rgba(0, 255, 255, 0.4), -6px 0 16px 0 rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0,0,0,0.8)',
          borderLeft: '2px solid rgba(0, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 10
        }}>
          <div className="w-28 p-4 flex-shrink-0" style={{ paddingTop: '100px' }}>
            <div className="flex flex-col gap-1.5">
              {menuIcons.map(({ id, icon, title, isImage }) => (
                <button 
                  key={id} 
                  onClick={() => changeView(id as 'normal' | 'chasis' | 'buttons' | 'knobs' | 'faders')} 
                  onMouseEnter={(e) => {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                    if (id === 'chasis') {
                      setShowChasisTooltip(true);
                    } else if (id === 'knobs') {
                      setShowKnobsTooltip(true);
                    } else if (id === 'faders') {
                      setShowFadersTooltip(true);
                    }
                  }}
                  onMouseLeave={() => {
                    if (id === 'chasis') {
                      setShowChasisTooltip(false);
                    } else if (id === 'knobs') {
                      setShowKnobsTooltip(false);
                    } else if (id === 'faders') {
                      setShowFadersTooltip(false);
                    }
                  }}
                  onMouseMove={(e) => {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }}
                                    className={`w-full aspect-square border-2 rounded-lg flex items-center justify-center p-2 transition-all duration-300 text-white relative ${
                    currentView === id
                      ? 'bg-gradient-to-br from-[#00FFFF] to-[#0080FF] border-[#00FFFF] shadow-lg'
                      : 'border-[#00FFFF] bg-gradient-to-br from-[#000000] to-[#1a1a1a] hover:from-[#00FFFF] hover:to-[#0080FF] hover:border-[#00FFFF] hover:shadow-lg'
                  }`} 
                  title={title}
                >

                  {isImage ? (
                    <img 
                      src={`textures/${icon}`}
                      alt={title}
                      className="w-full h-full mx-auto my-auto object-contain"
                      style={{
                        // Sin filtro para mostrar colores originales
                      }}
                      onError={(e) => {
                        console.error('Error loading image:', e);
                        console.log('Attempted to load:', `textures/${icon}`);
                      }}
                    />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox={id === 'chasis' ? '0 0 32 32' : id === 'knobs' ? '0 0 32 32' : id === 'faders' ? '0 0 24 24' : '0 0 24 24'}
                      className="w-4/5 h-4/5 mx-auto my-auto fill-white text-white" 
                      fill="#fff"
                    >
                      <path d={icon} />
                    </svg>
                  )}
                </button>
              ))}
              <input id="sidebar-upload" type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleSidebarFileChange} />
              <button type="button" onClick={() => document.getElementById('sidebar-upload')?.click()} className="w-full aspect-square border-2 rounded-lg flex items-center justify-center p-2 transition-all duration-300 text-white bg-gradient-to-br from-[#000000] to-[#1a1a1a] border-[#00FFFF] hover:from-[#00FFFF] hover:to-[#0080FF] hover:border-[#00FFFF] hover:shadow-lg" title="Subir archivos de personalización"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4/5 h-4/5 fill-white"><path d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2M12 4V6H12.5V4H12M8 8V19H16V8H8M10 10H14V12H10V10M10 14H14V16H10V14Z"/></svg></button>
            </div>
          </div>
          <div className="flex-1 p-4 flex flex-col">
            <div className="mt-24 animate-fadeIn">
              <p className="font-black text-sm tracking-wide uppercase m-0 mb-8 text-gray-200 text-left animate-fadeIn">{getTitle()}</p>
              <div className="grid grid-cols-2 gap-1 p-1 rounded overflow-x-auto animate-scaleIn">
                {Object.entries(getCurrentColors()).map(([name, colorData], index) => (<div key={name} className="w-10 h-10 rounded-full cursor-pointer border-2 border-[#a259ff] shadow-[0_0_6px_1px_#a259ff55] transition-all duration-200 shadow-inner hover:scale-110 animate-fadeInUp" style={{ backgroundColor: colorData.hex, animationDelay: `${index * 50}ms` }} title={name} onClick={() => applyColor(name, colorData)} />))}
              </div>
            </div>
            {(selectedButtons.length > 0 || selectedKnobs.length > 0 || selectedFaders.length > 0) && (<div className="mb-6 p-4 bg-gray-800 rounded-lg"><h4 className="text-lg font-semibold text-white mb-2">Selección múltiple ({selectedButtons.length + selectedKnobs.length + selectedFaders.length} elementos)</h4><p className="text-gray-300 text-sm">Haz clic en un color para aplicarlo a todos los elementos seleccionados</p></div>)}
          </div>
        </div>
        
        {/* Tooltips de los botones - siguen al mouse */}
        {showChasisTooltip && (
          <div 
            className="fixed bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[9999] border border-[#00FFFF] shadow-lg pointer-events-none"
            style={{
              left: mousePosition.x - 10, // 10px a la izquierda del cursor
              top: mousePosition.y - 50, // 50px arriba del cursor
              transform: 'translateX(-100%)' // Alinea el borde derecho del tooltip con la posición 'left'
            }}
          >
            Cambia el color de tu chasis
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-t-opacity-90"></div>
          </div>
        )}
        
        {showKnobsTooltip && (
          <div 
            className="fixed bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[9999] border border-[#00FFFF] shadow-lg pointer-events-none"
            style={{
              left: mousePosition.x - 10, // 10px a la izquierda del cursor
              top: mousePosition.y - 50, // 50px arriba del cursor
              transform: 'translateX(-100%)' // Alinea el borde derecho del tooltip con la posición 'left'
            }}
          >
            Cambia el color de tus knobs
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-t-opacity-90"></div>
          </div>
        )}
        
        {showFadersTooltip && (
          <div 
            className="fixed bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-[9999] border border-[#00FFFF] shadow-lg pointer-events-none"
            style={{
              left: mousePosition.x - 10, // 10px a la izquierda del cursor
              top: mousePosition.y - 50, // 50px arriba del cursor
              transform: 'translateX(-100%)' // Alinea el borde derecho del tooltip con la posición 'left'
            }}
          >
            Cambia el color de tus faders
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black border-t-opacity-90"></div>
          </div>
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
                    <li><b>Faders:</b> {Object.values(chosenColors.faders).join(', ') || 'Por defecto'}</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                {/* CORRECCIÓN DE SEGURIDAD APLICADA AQUÍ */}
                <PayPalButtons
                  style={{ layout: "horizontal", color: "blue", shape: "rect", label: "paypal", height: 48 }}
                  createOrder={createPaypalOrderOnServer}
                  onApprove={async (data) => {
                      const isVerified = await verifyPaypalPaymentOnServer(data.orderID);
                      if (isVerified) {
                          alert("¡Pago verificado y completado!");
                          setShowPaymentModal(false);
                          // Aquí puedes proceder a enviar el correo de confirmación
                      }
                  }}
                  onError={(err) => {
                    alert("Error en el pago con PayPal: " + err);
                  }}
                />
                {/* AVISO DE SEGURIDAD: Este formulario aún usa valores del cliente.
                    Para máxima seguridad, estos valores también deberían ser
                    generados y firmados por el servidor. */}
                <form action="https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/" method="post" target="_blank" className="w-full flex flex-col items-center"
                  onSubmit={async (e) => {
                    try {
                      await fetch('http://localhost:4000/api/sendgrid-mail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ colors: chosenColors, screenshot, paymentMethod: 'PayU' })
                      });
                    } catch (err) {
                      alert('Error enviando correo de pedido con SendGrid: ' + err);
                    }
                  }}
                >
                  <input type="hidden" name="merchantId" value="508029" />
                  <input type="hidden" name="accountId" value="512321" />
                  <input type="hidden" name="description" value="Controlador MIDI personalizado" />
                  <input type="hidden" name="referenceCode" value={payuReference} />
                  <input type="hidden" name="amount" value="185.00" />
                  <input type="hidden" name="tax" value="0" />
                  <input type="hidden" name="taxReturnBase" value="0" />
                  <input type="hidden" name="currency" value="USD" />
                  <input type="hidden" name="signature" value={payuSignature} />
                  <input type="hidden" name="test" value="1" />
                  <input type="hidden" name="buyerEmail" value="test@test.com" />
                  <input type="hidden" name="responseUrl" value="https://www.crearttech.com/" />
                  <input type="hidden" name="confirmationUrl" value="https://www.crearttech.com/" />
                  <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg">Pagar con PayU</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default MixoConfigurator;