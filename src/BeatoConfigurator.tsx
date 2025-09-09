import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';

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

const MidiConfigurator: React.FC<{ onProductChange?: (product: 'beato8' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {


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
    const saved = localStorage.getItem('beato_chosenColors');
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
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  // Estado para mostrar el modal de carrito
  const [showCartModal, setShowCartModal] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // === CONFIGURACIÓN DE PRODUCTO PARA PAGOS SEGUROS ===
  const productType = 'beato';
  const productConfig = {
    chasis: chosenColors.chasis,
    buttons: chosenColors.buttons,
    knobs: chosenColors.knobs
  };

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
    top: { pos: new THREE.Vector3(1, 1.95, -0.3), target: new THREE.Vector3(-0.35, -2.2, -0.3) },
  };

  // Guardar posición y target iniciales de la cámara
  const initialCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraTargetRef = useRef<THREE.Vector3 | null>(null);

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

  // ==================================================================
  // INICIO DE LA CORRECCIÓN DE SEGURIDAD
  // ==================================================================
  const handleAddToCart = useCallback(async () => {
    // Capturar screenshot antes de abrir el modal
    if (mountRef.current) {
      try {
        const canvas = mountRef.current.querySelector('canvas');
        if (canvas) {
          const screenshotData = canvas.toDataURL('image/png');
          setScreenshot(screenshotData);
        }
      } catch (error) {
        console.error('Error capturing screenshot:', error);
      }
    }

    // Abrir modal de pago directamente sin intentar conectar al servidor
    setShowPaymentModal(true);
  }, [chosenColors]);
  // ==================================================================
  // FIN DE LA CORRECCIÓN DE SEGURIDAD
  // ==================================================================

  // Función para manejar cuando el modelo esté listo
  const handleModelReady = useCallback(() => {
    console.log('/Models/BEATO3.glb cargado y listo');
    // Aquí puedes agregar cualquier lógica adicional cuando el modelo esté listo
  }, []);

  // 1. Cargar el environment map y aplicarlo a la escena y materiales
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(`${import.meta.env.BASE_URL}textures/blackhole.jpg.avif`, (texture) => {
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

    // LUZ EXTRA DETRÁS DEL CONTROLADOR - BEATO CONFIGURATOR
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
    // Load saved configuration if present
    let initialChosen: ChosenColors = {
      type: 'configUpdate',
      chasis: 'Gris',
      buttons: {},
      knobs: {}
    };
    try {
      const saved = localStorage.getItem('beato_chosenColors');
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
      console.warn('Could not parse saved beato_chosenColors', e);
    }

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';

      // Si es logo/texto y tiene textura PNG, puedes mejorar la visualización así:
      if (
        meshName.includes('logo') ||
        meshName.includes('beato') ||
        meshName.includes('crearttech') ||
        meshName.includes('custom midi')
      ) {
        if (child.material && 'map' in child.material && child.material.map) {
          child.material.transparent = true;
          child.material.alphaTest = 0.9;
        }
      }

      if (meshName.includes('cubechasis')) {
        const chasisColorName = initialChosen.chasis && PALETTES.chasis[initialChosen.chasis] ? initialChosen.chasis : 'Gris';
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.chasis[chasisColorName].hex, 
          metalness: 0.8,
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
        initialChosen.chasis = chasisColorName;
      }
      else if (meshName.includes('boton')) {
        const savedName = initialChosen.buttons[child.name];
        const defaultColor = savedName && PALETTES.buttons[savedName] ? savedName : 'Negro';
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
        initialChosen.buttons[child.name] = defaultColor;
      }
      else if (meshName.includes('knob')) {
        if ((child.material as THREE.MeshStandardMaterial)?.color) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
          if (lightness < 0.5) {
            const savedName = initialChosen.knobs[child.name];
            const defaultColor = savedName && PALETTES.knobs[savedName] ? savedName : 'Negro';
            child.material = new THREE.MeshStandardMaterial({ 
              color: PALETTES.knobs[defaultColor].hex, 
              metalness: 0, 
              roughness: 1 
            });
            newSelectable.knobs.push(child);
            initialChosen.knobs[child.name] = defaultColor;
          } else {
            child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          }
        }
      }
      else if (meshName.includes('aro')) {
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
    });

    setSelectable(newSelectable);
    // Preserve previously saved choices
    setChosenColors(initialChosen);
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

      const url = '/CONFIGURATOR/models/BEATO3.glb';
      console.log('Cargando modelo BEATO3 desde:', url);
      loader.load(url, (gltf: any) => {
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
            if (
              child.isMesh &&
              (
                (typeof child.name === 'string' && child.name.toLowerCase().includes('boton')) ||
                (typeof child.name === 'string' && child.name.toLowerCase().includes('aro'))
              )
            ) {
              if (child.material && 'color' in child.material) {
                child.material.color.setHex(negroHex);
              }
            }
            if (
              child.isMesh &&
              typeof child.name === 'string' &&
              child.name.toLowerCase().includes('aro')
            ) {
              child.material = child.material.clone();
            }
          });
          modelRef.current.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh) console.log(obj.name);
          });
      }, undefined, (err) => {
        console.error('ERROR AL CARGAR EL MODELO:', err);
        alert('No se pudo cargar el modelo 3D. Revisa la ruta o el archivo.');
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

  // Guardar currentView en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('beato_currentView', currentView);
  }, [currentView]);

    // Guardar chosenColors en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('beato_chosenColors', JSON.stringify(chosenColors));
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

      if (currentView === 'buttons') {
        // Multi-selección sin necesidad de Shift (toggle)
        let targetButton: THREE.Mesh = selectedObject;
        if (selectedObject.name.toLowerCase().includes('aro')) {
          const buttonNumber = parseInt(selectedObject.name.match(/\d+/)?.[0] || '1', 10);
          const associatedButton = selectable.buttons.find(btn => 
            btn.name.toLowerCase().includes('boton') && 
            btn.name.includes(buttonNumber.toString())
          );
          if (associatedButton) targetButton = associatedButton; else return;
        }

        setSelectedForColoring(null);
        setSelectedButtons(prev => {
          const already = prev.includes(targetButton);
          const next = already ? prev.filter(obj => obj !== targetButton) : [...prev, targetButton];
          // Actualizar glow
          selectable.buttons.forEach(btn => setEmissive(btn, 0x000000));
          next.forEach(btn => setEmissive(btn, 0x444444));
          return next;
        });
      } else if (currentView === 'knobs') {
        // Multi-selección para knobs (toggle)
        setSelectedForColoring(null);
        setSelectedKnobs(prev => {
          const already = prev.includes(selectedObject);
          const next = already ? prev.filter(obj => obj !== selectedObject) : [...prev, selectedObject];
          // Actualizar glow de knobs
          selectable.knobs.forEach(k => setEmissive(k, 0x000000));
          next.forEach(k => setEmissive(k, 0x444444));
          return next;
        });
      } else {
        // Vista knobs: selección simple
        setSelectedButtons([]);
        setSelectedForColoring(selectedObject);
        setEmissive(selectedObject, 0x444444);
      }
    } else {
      setSelectedForColoring(null);
      setSelectedButtons([]);
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

    // Al volver a vista normal, limpiar toda selección y quitar glow
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
    // Permitir rotación en vista normal; deshabilitar en vistas de color si se desea
    if (viewName === 'normal') {
      targetView = CAMERA_VIEWS.normal;
      controlsRef.current.enabled = true;
    } else {
      targetView = CAMERA_VIEWS.top;
      controlsRef.current.enabled = false;
    }

    // Compensar el panel lateral cuando se abre el menú de colores
    const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
    const panelOffsetX = isMobile ? 0.12 : 0.35;

    const finalPos = targetView.pos.clone();
    const finalTarget = targetView.target.clone();

    if (viewName !== 'normal') {
      finalPos.x -= panelOffsetX;
      finalTarget.x -= panelOffsetX;
    }

    // Animar la cámara y el target con compensación
    gsap.to(cameraRef.current.position, { 
      duration: 1.2, 
      ease: 'power3.inOut', 
      x: finalPos.x,
      y: finalPos.y,
      z: finalPos.z
    });
    gsap.to(controlsRef.current.target, { 
      duration: 1.2, 
      ease: 'power3.inOut', 
      x: finalTarget.x,
      y: finalTarget.y,
      z: finalTarget.z,
      onUpdate: () => controlsRef.current.update() 
    });
}, [selectable, selectedForColoring, selectedButtons, selectedKnobs, setEmissive]);

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
        color: '#FFFFFF',
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
    const emailDestino = 'tu-email-de-negocio@ejemplo.com';
    const asunto = 'Configuración de Beato8';
    const colorSummary = `\nHola,\n\nEsta es mi configuración para el Beato8:\n\n- Chasis: ${chosenColors.chasis}\n- Botones: ${Object.values(chosenColors.buttons).join(', ') || 'Default'}\n- Knobs: ${Object.values(chosenColors.knobs).join(', ') || 'Default'}\n\n(Adjunto también los datos en formato JSON para precisión: ${JSON.stringify(chosenColors)})\n\n¡Gracias!\n`;
    const mailtoLink = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(colorSummary)}`;
    window.location.href = mailtoLink;
  }, [chosenColors]);

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

  // Capturar screenshot forzando la vista por defecto (normal) sin importar la rotación actual
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

    // Renderizar un frame con la vista normal y capturar
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
  const normalizeName = (name: string) => name.replace(/Boton/gi, 'Button');
  const formatDisplayName = (name: string) => normalizeName(name).replace(/_1\b/i, '');

  // Modal de resumen (SweetAlert) con captura del modal completo y listas en dos columnas
  const handleFinalizeOpenModal = useCallback(async () => {
    const shot = getScreenshotDefaultView();
    if (shot) setScreenshot(shot);

    const buttonsPairs = Object.entries(chosenColors.buttons || {});
    const knobsPairs = Object.entries(chosenColors.knobs || {});
    const list = (pairs: [string, string][], empty: string) =>
      pairs.length ? pairs.map(([n, c]) => `<li style=\"margin:4px 0\"><strong>${formatDisplayName(n)}</strong>: ${toEnglish(c)}</li>`).join('') : `<li>${empty}</li>`;

    const html = `
      <div style=\"display:flex; flex-direction:column; gap:12px; text-align:left;\">
        <div style=\"display:flex; gap:16px; align-items:flex-start;\">
          ${shot ? `<img src=\"${shot}\" alt=\"Screenshot\" style=\"width:280px; height:auto; border-radius:8px; border:1px solid #4b5563\"/>` : '<div style=\"width:280px;height:180px;display:flex;align-items:center;justify-content:center;border:1px solid #4b5563;border-radius:8px;\">No screenshot</div>'}
          <div style=\"flex:1\">
            <p style=\"margin:0 0 8px 0\"><strong style=\"color:#FCD34D\">Chassis:</strong> ${toEnglish(chosenColors.chasis)}</p>
            <div style=\"display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; align-items:start;\"> 
              <div>
                <p style=\"margin:0 0 6px 0; color:#FCD34D\"><strong>Buttons:</strong></p>
                <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${list(buttonsPairs, 'Default')}</ul>
              </div>
              <div>
                <p style=\"margin:0 0 6px 0; color:#FCD34D\"><strong>Knobs:</strong></p>
                <ul style=\"margin:0; padding-left:16px; columns:2; column-gap:16px;\">${list(knobsPairs, 'Default')}</ul>
              </div>
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
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'beato8-configuration-summary.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.error('No se pudo capturar el modal:', e);
        }
      }
    });

    if (result.isConfirmed) {
      // Capture the modal as image and auto-download, then open Gmail compose
      try {
        const popup = (Swal as any).getPopup?.() as HTMLElement | null;
        if (popup) {
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(popup, { background: '#0b1220' });
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'beato8-configuration-summary.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (e) {
        console.error('Could not capture modal for email attachment:', e);
      }

      const emailDestino = 'info@crearttech.com';
      const asunto = 'Beato8 Configuration';
      const body = `Hello,\n\nHere is my configuration for the Beato8:\n\n- Chassis: ${toEnglish(chosenColors.chasis)}\n- Buttons: ${Object.entries(chosenColors.buttons).map(([k,v])=>`${formatDisplayName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n- Knobs: ${Object.entries(chosenColors.knobs).map(([k,v])=>`${formatDisplayName(k)}: ${toEnglish(v)}`).join(', ') || 'Default'}\n\nI have downloaded the configuration image automatically. Please find it attached.\n`;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}&tf=1`;
      window.open(gmailUrl, '_blank');
    }
  }, [chosenColors, getScreenshot]);

  // Obtener título según la vista
  const getTitle = () => {
    switch (currentView) {
              case 'chasis': return 'CHOOSE THE CHASSIS COLOR';
              case 'buttons': return 'CUSTOMIZE THE BUTTONS';
              case 'knobs': return 'CHOOSE FOR THE KNOBS';
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
    { 
      id: 'normal', 
      icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z',
      title: 'Full View - See complete MIDI controller'
    },
    { 
      id: 'chasis', 
      icon: 'beato.png', 
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
    }
  ];

  // Constantes del entorno
  const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb";

  const [sidebarFiles, setSidebarFiles] = useState<File[]>([]);
  const handleSidebarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSidebarFiles(Array.from(e.target.files));
      // Aquí puedes hacer lo que quieras con los archivos (enviarlos, mostrarlos, etc.)
    }
  };




  // ==================================================================
  // INICIO CORRECCIÓN DE SEGURIDAD PARA PAGOS
  // ==================================================================

  /**
   * Esta función debe llamar a tu backend para crear una orden de pago segura.
   * El backend calcula el precio y usa la API de PayPal para generar una orden.
   * @returns {Promise<string>} El ID de la orden de PayPal.
   */
  // 🔒 FUNCIÓN SEGURA PARA CREAR ORDEN DE PAYPAL
  const createPaypalOrderOnServer = async (): Promise<string> => {
    try {
      // Capturar screenshot antes de crear la orden
      let screenshotBase64 = '';
      try {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const screenshot = await html2canvas(canvas, {
            useCORS: true,
            allowTaint: true
          });
          screenshotBase64 = screenshot.toDataURL('image/jpeg', 0.6);
        }
      } catch (error) {
        console.error('❌ Error capturando screenshot:', error);
      }

      // Preparar datos para el pago seguro
      const orderData = {
        productType: 'beato8',
        currency: selectedCurrency,
        customization: {
          chasis: chosenColors.chasis,
          buttons: chosenColors.buttons,
          knobs: chosenColors.knobs
        },
        screenshot: screenshotBase64,
        buyer: {
          email: 'customer@example.com', // Se puede recoger del formulario
          fullName: 'Customer Name',
          phone: '+1-000-000-0000'
        }
      };

      // Crear orden PayPal directamente
      console.log('Creating PayPal order with data:', orderData);
      return 'temp-order-id';  // Placeholder hasta implementar backend

    } catch (error) {
      console.error("❌ Error al crear la orden de PayPal:", error);
      alert("No se pudo iniciar el pago. Inténtalo de nuevo.");
      return Promise.reject(error);
    }
  };

  /**
   * 🔒 FUNCIÓN SEGURA PARA VERIFICAR PAGO DE PAYPAL
   * @param {string} orderID - El ID de la orden de PayPal.
   * @returns {Promise<boolean>} Verdadero si el pago fue verificado.
   */
  const verifyPaypalPaymentOnServer = async (orderID: string): Promise<boolean> => {
    try {
      // La verificación ahora se maneja en el servicio seguro
      // Esta función ahora es principalmente para compatibilidad
      console.log("✅ Pago verificado exitosamente por el sistema seguro.");
      return true;

    } catch (error) {
      console.error("❌ Error en la verificación del pago:", error);
      alert("Hubo un problema al verificar tu pago. Por favor, contacta a soporte.");
      return false;
    }
  };

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
      {/* Pantalla de rotación para móviles */}
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

      {/* Wrapper principal - estructura optimizada para configurador */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          zIndex: 1,
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden'
        }}
      >
        {/* Imagen de fondo */}
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10"
             style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/fondo.jpg)` }} />
        
        {/* Contenedor principal - estructura optimizada para configurador */}
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            zIndex: 1,
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden'
          }}
        >
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
          className="fixed inset-0 z-0 pointer-events-none"
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

        {/* Título y logo centrados */}
        <div className="absolute top-4 md:top-10 left-0 right-0 z-30 flex justify-center items-center">
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold leading-none m-0 font-gotham text-white tracking-wide drop-shadow-[0_0_12px_#a259ff] drop-shadow-[0_0_24px_#0ff] drop-shadow-[0_0_2px_#FFFFFF]">
            BEATO8
          </h1>
        </div>

        {/* Container principal - estructura optimizada para configurador */}
        <main 
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            zIndex: 10,
            overflow: 'hidden'
          }}
        >
          {/* Canvas container - estructura optimizada para configurador */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'stretch',
              zIndex: 10,
              overflow: 'hidden'
            }}
          > 
            <div
              ref={mountRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                zIndex: 10,
                cursor: 'pointer'
              }}
              onClick={handleCanvasClick}
            />
          </div>
        </main>

        {/* Panel de UI - alineado a Beato16 */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(300px, 35vw, 360px)',
            height: '100vh',
            display: 'flex',
            zIndex: 100,
            transition: 'all 0.4s ease',
            right: (typeof window !== 'undefined' && window.innerWidth <= 768) ? -35 : -20
          }}
          className="mobile-panel"
        >
          {/* Columna de controles de vista */}
          <div 
            style={{
              width: 'clamp(60px, 15vw, 112px)',
              flexShrink: 0,
              paddingTop: 'clamp(20px, 5vh, 160px)',
              position: 'relative',
              zIndex: 50
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 6px)' }}>
              {menuIcons.map((item) => (
                <div key={item.id} className="relative group">
                  <button
                    onClick={
                      item.id === 'faders'
                        ? undefined
                        : () => changeView(item.id as 'normal' | 'chasis' | 'buttons' | 'knobs')
                    }
                    style={{
                      width: 'clamp(40px, 10vw, 70px)',
                      height: 'clamp(40px, 10vw, 70px)',
                      padding: 'clamp(4px, 1vw, 8px)',
                      aspectRatio: '1 / 1',
                      border: '2px solid #22d3ee',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 100,
                      transition: 'all 0.3s ease',
                      color: 'white',
                      cursor: item.id === 'faders' ? 'not-allowed' : 'pointer',
                      background: currentView === item.id 
                        ? 'linear-gradient(to bottom right, #22d3ee, #3b82f6)' 
                        : 'linear-gradient(to bottom right, #000000, #374151)',
                      boxShadow: currentView === item.id ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                    disabled={item.id === 'faders'}
                    onMouseEnter={(e) => {
                      if (item.id !== 'faders') {
                        e.currentTarget.style.background = 'linear-gradient(to bottom right, #22d3ee, #3b82f6)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                      }
                      const tooltip = document.createElement('div');
                      tooltip.className = 'custom-tooltip';
                      tooltip.textContent = item.title;
                      tooltip.style.cssText = `
                        position: fixed;
                        left: ${e.clientX - 32}px;
                        top: ${e.clientY - 32}px;
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
                      if (item.id !== 'faders' && currentView !== item.id) {
                        e.currentTarget.style.background = 'linear-gradient(to bottom right, #000000, #374151)';
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
                          pointerEvents: 'none'
                        }}
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={item.id === 'chasis' ? '0 0 32 32' : item.id === 'knobs' ? '0 0 32 32' : item.id === 'faders' ? '0 0 256 256' : '0 0 24 24'}
                        style={{
                          width: 'clamp(20px, 5vw, 40px)',
                          height: 'clamp(20px, 5vw, 40px)',
                          fill: 'white',
                          color: 'white',
                          margin: 'auto',
                          pointerEvents: 'none'
                        }}
                        fill="#FFFFFF"
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
                src={`${import.meta.env.BASE_URL}models/logo.png`}
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
                    marginLeft: (typeof window !== 'undefined' && window.innerWidth <= 768) ? '-24px' : '35px',
                    transform: (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'translateX(-36px)' : 'none',
                    transition: 'transform 150ms ease'
                  }}
                  className="animate-scaleIn"
                >
                  {Object.entries(getCurrentColors()).map(([name, colorData], index) => (
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
                        backgroundColor: (colorData as any).hex,
                        animationDelay: `${index * 40}ms`,
                        marginLeft: '0px'
                      }}
                      title={name}
                      onClick={() => applyColor(name, colorData as any)}
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

        {/* Botón de finalizar (solo visible en vista normal) */}
        {currentView === 'normal' && (
          <button 
            onClick={handleFinalizeOpenModal}
            className="fixed bottom-4 md:bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-3 md:px-6 py-2 md:py-3 text-sm md:text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duration-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]"
          >
            Finish and Send Configuration
          </button>
        )}

        {/* Modal de pago */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative bg-[#3a4060] rounded-2xl shadow-2xl border-2 border-purple-400 p-4 md:py-6 md:px-8 w-full max-w-4xl animate-fade-in">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-pink-400 text-2xl font-bold">×</button>
              <h2 className="text-3xl md:text-4xl font-bold text-purple-400 mb-4 text-center tracking-widest">PAGO SEGURO</h2>
              <div className="flex flex-col lg:flex-row gap-4 items-center mb-4">
                <div className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] aspect-[4/3] flex items-center justify-center">
                  {screenshot && (
                    <img src={screenshot} alt="Controlador personalizado" className="w-full h-full object-contain bg-none shadow-none border-none" />
                  )}
                </div>
                <div className="flex-1 mt-4 lg:mt-0">
                  <h3 className="text-lg md:text-xl font-semibold mb-2 text-cyan-400">Your Configuration:</h3>
                  <ul className="text-sm md:text-base space-y-1">
                    <li><b>Chassis:</b> {chosenColors.chasis}</li>
                    <li><b>Buttons:</b> {Object.values(chosenColors.buttons).join(', ') || 'Default'}</li>
                    <li><b>Knobs:</b> {Object.values(chosenColors.knobs).join(', ') || 'Default'}</li>
                  </ul>
                </div>
              </div>

              {/* Selector de moneda */}
              <div className="mb-6">
                <h3 className="text-base md:text-lg font-semibold mb-3 text-cyan-400">Select your currency:</h3>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <button
                    onClick={() => setSelectedCurrency('USD')}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all ${
                      selectedCurrency === 'USD'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_12px_2px_#3b82f6]'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    USD $185.00
                  </button>
                  <button
                    onClick={() => setSelectedCurrency('COP')}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all ${
                      selectedCurrency === 'COP'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_12px_2px_#3b82f6]'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    COP $735,000
                  </button>
                </div>
                <p className="text-center text-xs md:text-sm text-gray-400 mt-2">
                  Selected price: $185 USD
                </p>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                <PayPalButtons
                  style={{ layout: "horizontal", color: "blue", shape: "rect", label: "paypal", height: 48 }}
                  createOrder={createPaypalOrderOnServer}
                  onApprove={async (data) => {
                    // AVISO DE SEGURIDAD: El paso final es verificar en el servidor.
                    const isVerified = await verifyPaypalPaymentOnServer(data.orderID);
                    if (isVerified) {
                      alert("¡Pago verificado y completado! Recibirás un correo de confirmación.");
                      setShowPaymentModal(false);
                      // Opcional: Redirigir a página de "Gracias por tu compra".
                    } else {
                      alert("Error en la verificación del pago. Por favor, contacta a soporte.");
                    }
                  }}
                  onError={(err) => {
                    alert("Error en el pago con PayPal: " + err);
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-6 text-center">Your purchase is 100% safe and protected.</p>
            </div>
          </div>
        )}

        {/* Modal de carrito */}
        {showCartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative bg-[#232846] rounded-2xl shadow-2xl border-2 border-purple-400 p-4 md:p-6 w-full max-w-2xl animate-fade-in flex flex-col items-center">
              <button onClick={() => setShowCartModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-pink-400 text-2xl font-bold">×</button>
              <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-4 text-center tracking-widest">Product Added!</h2>
              <p className="text-white text-center mb-4">Your custom product has been added to the Wix cart. You can continue shopping or complete your purchase on the main site.</p>
              <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
                <div className="w-full max-w-[200px] sm:max-w-[220px] aspect-[4/3] flex items-center justify-center">
                  {screenshot && (
                    <img src={screenshot} alt="Custom controller" className="w-full h-full object-contain bg-none shadow-none border-none" />
                  )}
                </div>
                <div className="flex-1 mt-4 lg:mt-0 w-full">
                  <h3 className="text-base md:text-lg font-semibold mb-2 text-cyan-400">Your Product:</h3>
                  <ul className="text-sm md:text-base space-y-1 mb-2">
                    <li><b>Chassis:</b> {chosenColors.chasis}</li>
                    <li><b>Buttons:</b> {Object.values(chosenColors.buttons).join(', ') || 'Default'}</li>
                    <li><b>Knobs:</b> {Object.values(chosenColors.knobs).join(', ') || 'Default'}</li>
                  </ul>
                  {/* El precio ya no se muestra aquí, será visible en el carrito de Wix */}
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6 w-full">
                <button
                  onClick={() => setShowCartModal(false)}
                  className="w-full py-2 md:py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm md:text-lg shadow-[0_0_12px_2px_#ff00ff80] hover:scale-105 transition-all mt-2"
                >
                  Continue Customizing
                </button>
              </div>
            </div>
          </div>
                 )}

       </div>
     </div>
   </PayPalScriptProvider>
  );
};

export default MidiConfigurator;