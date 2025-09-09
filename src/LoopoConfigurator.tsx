import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import Swal from 'sweetalert2';

// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  knobs: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  knobs: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
}

const LoopoConfigurator: React.FC<{ onProductChange?: (product: 'beato' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {
  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'knobs'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
<<<<<<< HEAD
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
  
  // ==================================================================
  // DETECCIÓN DE ORIENTACIÓN
  // ==================================================================
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
<<<<<<< HEAD
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkOrientation();
    checkMobile();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
=======
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
<<<<<<< HEAD
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
    };
  }, []);
  
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('loopo_chosenColors');
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
      knobs: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], knobs: [] });
  const [screenshot, setScreenshot] = useState<string | null>(null);
<<<<<<< HEAD
  // Multi-selección de knobs y helper de glow (declarados aquí para uso posterior)
  const [selectedKnobs, setSelectedKnobs] = useState<THREE.Mesh[]>([]);
  const setEmissive = useCallback((object: THREE.Mesh | null, color: number = 0x000000) => {
    if (object && (object.material as THREE.MeshStandardMaterial)?.emissive) {
      (object.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    }
  }, []);
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

  // Eliminado: estado/efectos de pagos y moneda

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
    normal: { pos: new THREE.Vector3(2, 1, 0), target: new THREE.Vector3(0, -0.3, 0) },
    top:    { pos: new THREE.Vector3(1, 1.95, -0.3), target: new THREE.Vector3(-0.35, -1, -0.3) },
  };

  // Configuración de iluminación profesional
  const setupProfessionalLighting = useCallback((scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
    // Luz ambiental suave
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Luz direccional principal
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 4, -1);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.normalBias = 0.02;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // Luz de relleno fría
    const fillLight = new THREE.DirectionalLight(0x99ccff, 0.8);
    fillLight.position.set(-8, 3, -9);
    scene.add(fillLight);

    // Luz de relleno adicional
    const fillLight2 = new THREE.DirectionalLight(0x99ccff, 0.8);
    fillLight2.position.set(-8, 3, 15);
    scene.add(fillLight2);

    // Luz puntual para brillos
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 0.5);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // Luz de contorno trasera
    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(-5, 30, 0);
    backLight.castShadow = true;
    backLight.shadow.mapSize.width = 2048;
    backLight.shadow.mapSize.height = 2048;
    backLight.shadow.camera.near = 0.5;
    backLight.shadow.camera.far = 50;
    backLight.shadow.normalBias = 0.02;
    backLight.shadow.bias = -0.001;
    scene.add(backLight);

    // Luz de acento para detalles
    const accentLight = new THREE.SpotLight(0xffffff, 0.3, 10, Math.PI / 6, 0.5);
    accentLight.position.set(0, 8, 2);
    accentLight.target.position.set(0, 0, 0);
    scene.add(accentLight);
    scene.add(accentLight.target);
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

  // Preparar partes del modelo
  const prepareModelParts = useCallback((model: THREE.Group) => {
    const newSelectable: Selectable = { chasis: [], knobs: [] };
<<<<<<< HEAD
    // Cargar configuración previa si existe
    let initialChosen: ChosenColors = {
=======
    const newChosenColors: ChosenColors = {
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      type: 'configUpdate',
      chasis: 'Gris',
      knobs: {}
    };
<<<<<<< HEAD
    try {
      const saved = localStorage.getItem('loopo_chosenColors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialChosen = {
            type: 'configUpdate',
            chasis: parsed.chasis || 'Gris',
            knobs: parsed.knobs || {}
          };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved loopo_chosenColors', e);
    }
=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';

      if (meshName.includes('cubechasis')) {
        child.material = new THREE.MeshPhysicalMaterial({ 
<<<<<<< HEAD
          color: PALETTES.chasis[initialChosen.chasis] ? PALETTES.chasis[initialChosen.chasis].hex : PALETTES.chasis['Gris'].hex, 
=======
          color: PALETTES.chasis['Gris'].hex, 
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
          metalness: 0.8,
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
<<<<<<< HEAD
        initialChosen.chasis = initialChosen.chasis || 'Gris';
=======
        newChosenColors.chasis = 'Gris';
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      }
      else if (meshName.includes('aro')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, reflectivity: 0.5, transmission: 0.3, thickness: 0.5, ior: 1.4, attenuationDistance: 1.0, attenuationColor: 0xffffff, transparent: true, opacity: 0.7 });
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
    // Preservar las elecciones previas
    setChosenColors(initialChosen);
=======
    setChosenColors(newChosenColors);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
  }, []);

  // Cargar modelo
  const loadModel = useCallback(async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
<<<<<<< HEAD
      loader.load(`${import.meta.env.BASE_URL}models/loopo.glb`, (gltf: any) => {
=======
      loader.load('./models/loopo.glb', (gltf: any) => {
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
        console.log('LoopoConfigurator: Model loaded successfully');
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

  // Inicialización de Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    // Crear escena
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    sceneRef.current = scene;

    // Crear renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Crear cámara
    const camera = new THREE.PerspectiveCamera(
      35, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      200
    );
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    cameraRef.current = camera;

    // Crear controles
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(CAMERA_VIEWS.normal.target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 2;
      controls.maxDistance = 5;
      controls.enablePan = false;
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

  // Guardar configuraciones en localStorage
  useEffect(() => {
    localStorage.setItem('loopo_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('loopo_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Aplicar colores guardados
  useEffect(() => {
    if (selectable.chasis.length > 0 || selectable.knobs.length > 0) {
      // Aplicar color del chasis
      if (chosenColors.chasis && PALETTES.chasis[chosenColors.chasis]) {
        const colorHex = PALETTES.chasis[chosenColors.chasis].hex;
        selectable.chasis.forEach(mesh => {
          if (mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
          }
        });
      }

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

  // Función para cambiar vista
  const changeView = useCallback((view: 'normal' | 'chasis' | 'knobs') => {
    setCurrentView(view);

    if (view === 'chasis' && selectable.chasis.length > 0) {
      setSelectedForColoring(selectable.chasis[0]);
    } else {
      setSelectedForColoring(null);
    }

<<<<<<< HEAD
    // Limpiar selección y glow al volver a vista normal
    if (view === 'normal') {
      if (selectedForColoring) setEmissive(selectedForColoring, 0x000000);
      selectedKnobs.forEach(k => setEmissive(k, 0x000000));
      setSelectedKnobs([]);
      setSelectedForColoring(null);
    }

=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
    if (!cameraRef.current || !controlsRef.current) return;

    let targetView;
    let enableOrbit;
    if (view === 'normal') {
      targetView = CAMERA_VIEWS.normal;
      enableOrbit = true;
    } else {
      targetView = CAMERA_VIEWS.top;
      enableOrbit = false;
    }
    controlsRef.current.enabled = enableOrbit;

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
  }, [selectable, selectedForColoring, selectedKnobs, setEmissive]);
=======
  }, [selectable]);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

  // Función para cambiar color
  const changeColor = useCallback((colorName: string) => {
    if (!selectedForColoring) return;

    const meshName = selectedForColoring.name.toLowerCase();
    let palette: Record<string, PaletteColor> | null = null;
    let colorKey: string | null = null;

    if (meshName.includes('cubechasis')) {
      palette = PALETTES.chasis;
      colorKey = 'chasis';
    } else if (meshName.includes('knob')) {
      palette = PALETTES.knobs;
      colorKey = selectedForColoring.name;
    }

    if (palette && colorKey && palette[colorName]) {
      const colorHex = palette[colorName].hex;
      if (selectedForColoring.material && 'color' in selectedForColoring.material) {
        (selectedForColoring.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
      }

      setChosenColors(prev => ({
        ...prev,
        [colorKey === 'chasis' ? 'chasis' : 'knobs']: colorKey === 'chasis' ? colorName : {
          ...prev.knobs,
          [colorKey]: colorName
        }
      }));
    }
  }, [selectedForColoring]);

  // Manejo de clicks en el canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraRef.current || !rendererRef.current) return;

    if (currentView === 'chasis') {
      setSelectedForColoring(null);
      return;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const bounds = rendererRef.current.domElement.getBoundingClientRect();
    
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    
    raycaster.setFromCamera(pointer, cameraRef.current);
    
    let objectsToIntersect: THREE.Mesh[] = [];
    if (currentView === 'knobs') {
      objectsToIntersect = selectable.knobs;
    } else if (currentView === 'normal') {
      objectsToIntersect = selectable.knobs;
    }
    
    if (objectsToIntersect.length === 0) return;
    
    const intersects = raycaster.intersectObjects(objectsToIntersect, false);
    
    if (intersects.length > 0) {
<<<<<<< HEAD
      const hit = intersects[0].object as THREE.Mesh;
      if (currentView === 'normal') return;

      if (currentView === 'knobs') {
        setSelectedForColoring(null);
        setSelectedKnobs(prev => {
          const already = prev.includes(hit);
          const next = already ? prev.filter(k => k !== hit) : [...prev, hit];
          selectable.knobs.forEach(k => setEmissive(k, 0x000000));
          next.forEach(k => setEmissive(k, 0x444444));
          return next;
        });
      } else {
        setSelectedKnobs([]);
        setSelectedForColoring(hit);
        setEmissive(hit, 0x444444);
      }
    } else {
      setSelectedForColoring(null);
      setSelectedKnobs([]);
    }
  }, [currentView, selectable, setEmissive]);
=======
      const selectedObject = intersects[0].object as THREE.Mesh;
      setSelectedForColoring(selectedObject);
    } else {
      setSelectedForColoring(null);
    }
  }, [currentView, selectable]);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

  // Función para obtener título
  const getTitle = () => {
    if (currentView === 'chasis') {
      return "CHASIS";
    } else if (currentView === 'knobs') {
      return "KNOBS";
    }
    return "LOOPO";
  };

  // Función para obtener colores actuales
  const getCurrentColors = () => {
    if (currentView === 'chasis') {
      return PALETTES.chasis;
    } else if (currentView === 'knobs') {
      return PALETTES.knobs;
    }
    return PALETTES.chasis; // Por defecto
  };

<<<<<<< HEAD
  // Estado de selección múltiple y helper de glow (duplicado eliminado; declarado antes en el archivo)

=======
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
  // Función para aplicar color
  const applyColor = useCallback((name: string, colorData: PaletteColor) => {
    if (currentView === 'chasis') {
      setChosenColors(prev => ({ ...prev, chasis: name }));
      selectable.chasis.forEach(mesh => {
        if (mesh.material && 'color' in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorData.hex.replace('#', ''), 16));
        }
      });
<<<<<<< HEAD
    } else if (currentView === 'knobs' && selectedKnobs.length > 0) {
      const newChosen = { ...chosenColors, knobs: { ...chosenColors.knobs } };
      selectedKnobs.forEach(knob => {
        if (knob.material && 'color' in knob.material) {
          (knob.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorData.hex.replace('#', ''), 16));
        }
        newChosen.knobs[knob.name] = name;
      });
      setChosenColors(newChosen);
      selectedKnobs.forEach(k => setEmissive(k, 0x000000));
      setSelectedKnobs([]);
    } else if (currentView === 'knobs' && selectedForColoring) {
      setChosenColors(prev => ({ ...prev, knobs: { ...prev.knobs, [selectedForColoring.name]: name } }));
=======
    } else if (currentView === 'knobs' && selectedForColoring) {
      setChosenColors(prev => ({
        ...prev,
        knobs: { ...prev.knobs, [selectedForColoring.name]: name }
      }));
      // Aplicar color al knob seleccionado
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      if (selectedForColoring.material && 'color' in selectedForColoring.material) {
        (selectedForColoring.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorData.hex.replace('#', ''), 16));
      }
    }
<<<<<<< HEAD
  }, [currentView, selectable, selectedForColoring, selectedKnobs, chosenColors, setEmissive]);

  // Capturar screenshot siempre en vista por defecto
  const getScreenshotDefaultView = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current || !controlsRef.current || !sceneRef.current) return null;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const prevPos = camera.position.clone();
    const prevTarget = controls.target.clone();
    const prevEnabled = controls.enabled;

    camera.position.copy(CAMERA_VIEWS.normal.pos);
    controls.target.copy(CAMERA_VIEWS.normal.target);
    controls.enabled = false;
    controls.update();

    renderer.render(sceneRef.current, camera);
    let dataUrl: string | null = null;
    try { dataUrl = renderer.domElement.toDataURL('image/png'); } catch (e) { console.error('No se pudo capturar screenshot (vista por defecto):', e); }

    camera.position.copy(prevPos);
    controls.target.copy(prevTarget);
    controls.enabled = prevEnabled;
    controls.update();
    renderer.render(sceneRef.current, camera);

    return dataUrl;
  }, []);

  // Abrir modal de resumen con screenshot + selección
  const handleFinalizeOpenModal = useCallback(async () => {
    const shot = getScreenshotDefaultView();
    if (shot) setScreenshot(shot);

    // Guardar un resumen persistente de la selección actual
    try {
      const summary = {
        product: 'loopo',
        chassis: chosenColors.chasis,
        knobs: chosenColors.knobs,
        screenshot: shot || null,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('loopo_last_summary', JSON.stringify(summary));
    } catch (e) {
      console.warn('No se pudo guardar el resumen en localStorage:', e);
    }

    const colorMap: Record<string, string> = {
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
    const toEnglish = (name: string) => colorMap[name] || name;

    const knobsPairs = Object.entries(chosenColors.knobs || {});
    const cleanName = (n: string) => n.replace(/_1\b/gi, '');
    const knobsHtml = knobsPairs.length
      ? knobsPairs.map(([name, color]) => `<li style=\"margin:4px 0\"><strong>${cleanName(name)}</strong>: ${toEnglish(color)}</li>`).join('')
      : '<li>Default</li>';

    const html = `
      <div style=\"display:flex; flex-direction:column; gap:12px; text-align:left;\">
        <div style=\"display:flex; gap:16px; align-items:flex-start;\">
          ${shot ? `<img src=\"${shot}\" alt=\"Screenshot\" style=\"width:280px; height:auto; border-radius:8px; border:1px solid #4b5563\"/>` : '<div style=\"width:280px;height:180px;display:flex;align-items:center;justify-content:center;border:1px solid #4b5563;border-radius:8px;\">No screenshot</div>'}
          <div style=\"flex:1\">
            <p style=\"margin:0 0 8px 0\"><strong>Chassis:</strong> ${toEnglish(chosenColors.chasis)}</p>
            <p style=\"margin:0 0 6px 0\"><strong>Knobs:</strong></p>
            <ul style=\"margin:0; padding-left:16px;\">${knobsHtml}</ul>
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
          a.download = 'resumen-configuracion-loopo.png';
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
      const emailDestino = 'tu-email-de-negocio@ejemplo.com';
      const asunto = 'Configuración de Loopo';
      const body = `\nHola,\n\nEsta es mi configuración para el Loopo:\n\n- Chasis: ${chosenColors.chasis}\n- Knobs: ${Object.entries(chosenColors.knobs).map(([k,v])=>`${k}: ${v}`).join(', ') || 'Default'}\n\n(Adjunto la imagen descargada desde el configurador)\n`;
      const link = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`;
      window.location.href = link;
    }
  }, [chosenColors, getScreenshotDefaultView]);

  // Checkout eliminado: flujo reemplazado por modal + mailto
=======
  }, [currentView, selectable, selectedForColoring]);

  // Función para abrir modal de pago
  const handleOpenPayment = useCallback(() => {
    const emailDestino = 'tu-email-de-negocio@ejemplo.com';
    const asunto = 'Configuración de Loopo';
    const body = `\nHola,\n\nEsta es mi configuración para el Loopo:\n\n- Chasis: ${chosenColors.chasis}\n- Knobs: ${Object.values(chosenColors.knobs).join(', ') || 'Default'}\n\n(Adjunto también los datos en formato JSON para precisión: ${JSON.stringify(chosenColors)})\n\n¡Gracias!\n`;
    const link = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(body)}`;
    window.location.href = link;
  }, [chosenColors]);

  // Función para manejar el checkout de PayU localmente
  const handlePayUCheckoutLocal = () => {
    const popupTarget = 'payu_checkout';
    let popupRef = window.open('', popupTarget);
    
    if (!popupRef) {
      alert('Please allow popups to continue with payment');
      return;
    }

    // Obtener configuración de la moneda seleccionada
    const currencyConfig = getLoopoCurrencyConfig(selectedCurrency);
    
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
      description: `Loopo Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`,
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
      extra1: 'Loopo',
      extra2: chosenColors.chasis || 'Custom',
      extra3: `Applied colors - Knobs: ${Object.keys(chosenColors.knobs || {}).length}`,
      extra4: `Loopo Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`,
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
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1

  const menuIcons = [
    { id: 'normal', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z', title: 'Full View - See complete MIDI controller' },
    { id: 'chasis', icon: 'loopo.png', title: 'Customize Chassis - Change main body color', isImage: true },
    { id: 'knobs', icon: 'M9.42 4.074a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56M11.554 8.8a.5.5 0 0 1 0 .707l-1.78 1.78a.5.5 0 1 1-.708-.707l1.78-1.78a.5.5 0 0 1 .708 0 M9.42 15.444c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.03 1.32-3.19 1.32m0-1.1a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82M6.757 5.2a.56.56 0 1 0-.965.567l.465.809l.005.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm5.315.012a.55.55 0 0 1 .761-.206c.277.152.36.5.203.764l-.458.797a.56.56 0 0 1-.478.277a.564.564 0 0 1-.487-.834zm7.598 5.722a.5.5 0 0 1 .5-.5h2.52a.5.5 0 1 1 0 1h-2.52a.5.5 0 0 1-.5-.5 M22.69 15.454c2.49 0 4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52s2.03 4.52 4.52 4.52m0-1.11a3.41 3.41 0 1 1 0-6.82a3.41 3.41 0 0 1 0 6.82m-.56-9.7c0-.308.252-.56.56-.56s.56.252.56.56v.945a.566.566 0 0 1-.56.535a.56.56 0 0 1-.56-.56zm-2.103.566a.557.557 0 0 0-.763-.202a.566.566 0 0 0-.204.753l.468.815l.004.006a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.075a.566.566 0 0 0 .205-.753zm6.086-.204a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M11.93 22.636H9.42a.5.5 0 0 0 0 1h2.51a.5.5 0 1 0 0-1 M4.9 23.136c0 2.49 2.03 4.52 4.52 4.52s4.52-2.03 4.52-4.52s-2.03-4.52-4.52-4.52s-4.52 2.03-4.52 4.52m7.93 0a3.41 3.41 0 1 1-6.82 0a3.41 3.41 0 0 1 6.82 0m-3.41-6.86a.56.56 0 0 0-.56.56v.93c0 .308.252.56.56.56s.56-.252.56-.56v-.93a.56.56 0 0 0-.56-.56m-3.418.93a.566.566 0 0 1 .755.206l.464.807c.137.258.06.6-.205.753a.53.53 0 0 1-.276.074a.58.58 0 0 1-.478-.261l-.005-.007l-.468-.814a.566.566 0 0 1 .207-.755zm6.08.209a.55.55 0 0 1 .761-.206c.277.151.36.499.203.764l-.462.802a.567.567 0 0 1-.766.194a.55.55 0 0 1-.194-.76zm8.475 3.588a.5.5 0 0 1 .707 0l1.78 1.78a.5.5 0 0 1-.707.707l-1.78-1.78a.5.5 0 0 1 0-.707 M22.69 27.656c-1.16 0-2.32-.44-3.2-1.32a4.527 4.527 0 0 1 0-6.39a4.527 4.527 0 0 1 6.39 0a4.527 4.527 0 0 1 0 6.39c-.88.88-2.04 1.32-3.19 1.32m0-1.11a3.41 3.41 0 1 0 0-6.82a3.41 3.41 0 0 0 0 6.82 M22.13 16.836c0-.308.252-.56.56-.56s.56.252.56.56v.945a.57.57 0 0 1-.56.545a.56.56 0 0 1-.56-.56zm-2.103.576a.566.566 0 0 0-.755-.206l-.006.003a.565.565 0 0 0-.206.755l.468.814l.004.007a.58.58 0 0 0 .478.262a.53.53 0 0 0 .276-.074a.566.566 0 0 0 .205-.753zm6.086-.203a.55.55 0 0 0-.761.206l-.458.795a.55.55 0 0 0 .194.759a.5.5 0 0 0 .282.077a.6.6 0 0 0 .478-.261l.005-.007l.463-.805a.55.55 0 0 0-.203-.764 M1 5.75A4.75 4.75 0 0 1 5.75 1h20.52a4.75 4.75 0 0 1 4.75 4.75v20.48a4.75 4.75 0 0 1-4.75 4.75H5.75A4.75 4.75 0 0 1 1 26.23zM5.75 3A2.75 2.75 0 0 0 3 5.75v20.48a2.75 2.75 0 0 0 2.75 2.75h20.52a2.75 2.75 0 0 0 2.75-2.75V5.75A2.75 2.75 0 0 0 26.27 3z', title: 'Customize Knobs - Change rotary control colors' }
  ];

  // Configuración de partículas - TEMPORALMENTE DESHABILITADO
  // const particlesInit = async (main: any) => {
  //   await loadFull(main);
  // };

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
<<<<<<< HEAD
            backgroundImage: `url(${import.meta.env.BASE_URL}textures/fondo.jpg)`,
=======
            backgroundImage: 'url(/textures/fondo.jpg)',
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        />
        <div className="w-full h-screen text-gray-200 overflow-hidden relative" style={{ background: "transparent" }}>
        {/* Fondo degradado estático */}
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
        {/* Botón de inicio y LOOPO (izquierda) */}
        <div 
          className="fixed top-2 md:top-4 z-50 flex items-center gap-2 md:gap-3"
          style={{ left: '-20px' }}
        >
          <button 
            onClick={() => window.location.href = 'https://www.crearttech.com/' }
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
            LOOPO
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
          style={{
            position: 'fixed',
            top: 0,
<<<<<<< HEAD
            width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(300px, 35vw, 360px)',
            height: '100vh',
            display: 'flex',
            zIndex: 10,
            transition: 'all 0.4s ease',
            right: isMobile ? -35 : -20
          }}
          className="mobile-panel"
=======
            width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(280px, 70vw, 320px)',
            height: '100vh',
            display: 'flex',
            zIndex: 10,
            transition: 'all 0.4s ease'
          }}
          className="mobile-panel right-[-35px] md:right-[-20px]"
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
        >

          {/* Columna de controles de vista */}
          <div 
            style={{
              width: 'clamp(60px, 15vw, 112px)',
              flexShrink: 0,
              paddingTop: 'clamp(30px, 8vh, 100px)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 6px)' }}>
              {menuIcons.map(({ id, icon, title, isImage }) => (
                <button
                  key={id}
                  onClick={
                    id === 'faders'
                      ? undefined
                      : () => changeView(id as 'normal' | 'chasis' | 'knobs')
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
<<<<<<< HEAD
                      src={`${import.meta.env.BASE_URL}textures/${icon}`}
=======
                      src={`textures/${icon}`}
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                      alt={title}
                      style={{
                        width: 'clamp(20px, 5vw, 40px)',
                        height: 'clamp(20px, 5vw, 40px)',
                        objectFit: 'contain',
                        margin: 'auto'
                      }}
                      onError={(e) => {
                        console.error('Error loading image:', e);
<<<<<<< HEAD
                        console.log('Attempted to load:', `${import.meta.env.BASE_URL}textures/${icon}`);
=======
                        console.log('Attempted to load:', `textures/${icon}`);
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
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
                        margin: 'auto'
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
          {/* Contenido de la UI (fondo/borde/padding como Beato16) */}
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
<<<<<<< HEAD
                src={`${import.meta.env.BASE_URL}models/logo.png`}
=======
                src="models/logo.png"
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                alt="Logo"
                style={{
                  height: currentView === 'normal' ? 'clamp(20px, 5vw, 24px)' : 'clamp(28px, 7vw, 32px)',
                  width: 'auto',
                  filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)'
                }}
              />
            </div>

<<<<<<< HEAD
            {/* Sección de colores - igual a Beato16 (2 columnas y márgenes responsive) */}
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
=======
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'clamp(4px, 1vw, 6px)',
                    padding: 0,
                    justifyItems: 'end',
                    marginLeft: 'auto'
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                  }}
                  className="animate-scaleIn"
                >
                  {Object.entries(getCurrentColors()).map(([name, colorData], index) => (
                    <div
                      key={name}
                      style={{
<<<<<<< HEAD
                        width: 'clamp(30px, 7vw, 44px)',
                        height: 'clamp(30px, 7vw, 44px)',
=======
                        width: 'clamp(32px, 8vw, 40px)',
                        height: 'clamp(32px, 8vw, 40px)',
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: '1px solid #a259ff',
                        boxShadow: '0 0 6px 1px rgba(162, 89, 255, 0.33)',
<<<<<<< HEAD
                        transition: 'transform 0.15s ease, margin-left 0.15s ease',
                        backgroundColor: colorData.hex,
                        animationDelay: `${index * 40}ms`,
                        marginLeft: '0px'
=======
                        transition: 'all 0.2s ease',
                        backgroundColor: colorData.hex,
                        animationDelay: `${index * 50}ms`
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
                      }}
                      title={name}
                      onClick={() => applyColor(name, colorData)}
                      onMouseEnter={(e) => {
<<<<<<< HEAD
                        e.currentTarget.style.transform = 'scale(1.07)';
=======
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

            {/* Información de selección múltiple */}
            {currentView === 'knobs' && selectedForColoring && (
              <div 
                style={{
                  marginBottom: 'clamp(16px, 4vw, 24px)',
                  padding: 'clamp(8px, 2vw, 16px)',
                  background: '#1f2937',
                  borderRadius: '8px'
                }}
                className="animate-scaleIn"
              >
                <h4 
                  style={{
                    fontSize: 'clamp(12px, 3vw, 18px)',
                    fontWeight: 600,
                    color: 'white',
                    marginBottom: 'clamp(4px, 1vw, 8px)'
                  }}
                  className="animate-fadeIn"
                >
                  Seleccionado: {selectedForColoring.name}
                </h4>
                <p 
                  style={{
                    color: '#d1d5db',
                    fontSize: 'clamp(10px, 2vw, 14px)'
                  }}
                  className="animate-fadeIn"
                >
                  Haz clic en un color para aplicarlo al knob seleccionado
                </p>
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
          </button>
        )}

        {/* Flujo de pago eliminado: ahora se usa modal + mailto */}
=======
        {/* Botón de comprar (solo visible en vista normal) */}
        {currentView === 'normal' && (
          <button 
            onClick={handleOpenPayment}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duración-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]"
          >
            Finalizar y Enviar Configuración
          </button>
        )}

        {/* Flujo de pago eliminado: ahora se usa mailto */}
>>>>>>> 5552411d31ab59e609c5b6d4bc92af73ca326af1
      </div>
    </div>
  );
};

export default LoopoConfigurator; 