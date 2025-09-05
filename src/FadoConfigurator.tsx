import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import Swal from 'sweetalert2';

// Tipos para los objetos seleccionables
interface Selectable {
  chasis: THREE.Mesh[];
  faders: THREE.Mesh[];
}

interface ChosenColors {
  type: string;
  chasis: string;
  faders: Record<string, string>;
}

interface PaletteColor {
  hex: string;
}

interface Palettes {
  chasis: Record<string, PaletteColor>;
  faders: Record<string, PaletteColor>;
  knobs: Record<string, PaletteColor>;
}

const FadoConfigurator: React.FC<{ onProductChange?: (product: 'beato' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado') => void }> = ({ onProductChange }) => {
  // Referencias para Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const modelOriginalPositionRef = useRef<THREE.Vector3 | null>(null);

  // Estados de React
  const [currentView, setCurrentView] = useState<'normal' | 'chasis' | 'faders'>('normal');
  const [selectedForColoring, setSelectedForColoring] = useState<THREE.Mesh | null>(null);
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
  
  const [chosenColors, setChosenColors] = useState<ChosenColors>(() => {
    const saved = localStorage.getItem('fado_chosenColors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved colors:', e);
      }
    }
    return {
      type: 'configUpdate',
      chasis: 'Gray',
      faders: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], faders: [] });
  
  // Estado para selección múltiple de faders
  const [selectedFaders, setSelectedFaders] = useState<THREE.Mesh[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Eliminado: estado/efectos de pagos y moneda

  // Palette configuration
  const PALETTES: Palettes = {
    chasis: {
      'Green':     { hex: '#7CBA40' },
      'Yellow':    { hex: '#F3E600' },
      'Blue':      { hex: '#325EB7' },
      'White':     { hex: '#F5F5F5' },
      'Orange':    { hex: '#F47119' },
      'Purple':    { hex: '#7B217E' },
      'Red':       { hex: '#E52421' },
      'Black':     { hex: '#1C1C1C' },
      'Pink':      { hex: '#FF007F' },
      'Gray':      { hex: '#808080' },
    },
    faders: {
      'Green':     { hex: '#7CBA40' },
      'Yellow':    { hex: '#F3E600' },
      'Blue':      { hex: '#325EB7' },
      'White':     { hex: '#F5F5F5' },
      'Orange':    { hex: '#F47119' },
      'Purple':    { hex: '#7B217E' },
      'Red':       { hex: '#E52421' },
      'Black':     { hex: '#1C1C1C' },
      'Pink':      { hex: '#FF007F' },
      'Gray':      { hex: '#808080' },
    },
    knobs: {
      'Green':     { hex: '#7CBA40' },
      'Yellow':    { hex: '#F3E600' },
      'Blue':      { hex: '#325EB7' },
      'White':     { hex: '#F5F5F5' },
      'Orange':    { hex: '#F47119' },
      'Purple':    { hex: '#7B217E' },
      'Red':       { hex: '#E52421' },
      'Black':     { hex: '#1C1C1C' },
      'Pink':      { hex: '#FF007F' },
      'Gray':      { hex: '#808080' },
    }
  };

  const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1, -0.1), target: new THREE.Vector3(0, -0.3, -0.1) },
    top:    { pos: new THREE.Vector3(1, 1.65, -0.3), target: new THREE.Vector3(-0.35, -0.9, -0.3) },
  };

  // Función para aplicar efectos de glow
  const setEmissive = useCallback((mesh: THREE.Mesh, color: number) => {
    if (mesh.material && 'emissive' in mesh.material) {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    }
  }, []);

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
    const newSelectable: Selectable = { chasis: [], faders: [] };
    const newChosenColors: ChosenColors = {
      type: 'configUpdate',
      chasis: 'Gray',
      faders: {}
    };

    const allMeshes: string[] = [];
    
    // Debug: Mostrar estructura del modelo
    console.log('🏗️ Estructura del modelo fado.glb:');
    const printStructure = (obj: THREE.Object3D, level: number = 0) => {
      const indent = '  '.repeat(level);
      const type = obj.type;
      const name = obj.name || 'sin nombre';
      console.log(`${indent}${type}: ${name}`);
      obj.children.forEach(child => printStructure(child, level + 1));
    };
    printStructure(model);
    
    // Buscar específicamente la colección "faders"
    console.log('🔍 Buscando colección "faders"...');
    const findFadersCollection = (obj: THREE.Object3D): THREE.Object3D | null => {
      if (obj.name.toLowerCase() === 'faders') {
        console.log('✅ Encontrada colección "faders":', obj);
        return obj;
      }
      for (const child of obj.children) {
        const found = findFadersCollection(child);
        if (found) return found;
      }
      return null;
    };
    
    const fadersCollection = findFadersCollection(model);
    if (fadersCollection) {
      console.log('🎛️ Contenido de la colección faders:');
      fadersCollection.children.forEach((child, index) => {
        console.log(`   ${index + 1}. ${child.type}: ${child.name}`);
      });
    } else {
      console.log('⚠️ No se encontró la colección "faders"');
    }
    
    model.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const meshName = typeof child.name === 'string' ? child.name.toLowerCase() : '';
      allMeshes.push(child.name);
      
      console.log(`🔍 Procesando mesh: "${child.name}" (lowercase: "${meshName}")`);
      
      // Log específico para meshes que contengan 'fader'
      if (meshName.includes('fader')) {
        console.log(`🎯 MESH FADER DETECTADO: "${child.name}" (meshName: "${meshName}")`);
      }

      if (meshName.includes('cubechasis')) {
        child.material = new THREE.MeshPhysicalMaterial({ 
          color: PALETTES.chasis['Gray'].hex, 
          metalness: 0.8,
          roughness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1
        });
        newSelectable.chasis.push(child);
        newChosenColors.chasis = 'Gris';
      }
      else if (meshName.includes('aro')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, reflectivity: 0.5, transmission: 0.3, thickness: 0.5, ior: 1.4, attenuationDistance: 1.0, attenuationColor: 0xffffff, transparent: true, opacity: 0.7 });
      }
      else if (meshName.includes('fader')) {
        console.log('Fader detectado en Fado:', child.name);
        if (meshName === 'fader1_1' || meshName === 'fader2_1' || meshName === 'fader3_1' || meshName === 'fader4_1' || meshName === 'fader5_1' || meshName === 'fader6_1' || meshName === 'fader7_1' || meshName === 'fader8_1') {
          const defaultColor = 'Black';
          child.material = new THREE.MeshStandardMaterial({ color: PALETTES.faders[defaultColor].hex, metalness: 0, roughness: 1 });
          newSelectable.faders.push(child);
          newChosenColors.faders[child.name] = defaultColor;
        } else {
          if (child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.color) {
              const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
              if (lightness < 0.8) {
                const defaultColor = 'Black';
                mat.color.setHex(parseInt(PALETTES.faders[defaultColor].hex.replace('#', ''), 16));
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
  }, []);

  // Cargar modelo
  const loadModel = useCallback(async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
      loader.load('./models/fado.glb', (gltf: any) => {
        console.log('FadoConfigurator: Model loaded successfully');
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
    localStorage.setItem('fado_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('fado_chosenColors', JSON.stringify(chosenColors));
  }, [chosenColors]);

  // Aplicar colores guardados
  useEffect(() => {
    if (selectable.chasis.length > 0 || selectable.faders.length > 0) {
      // Aplicar color del chasis
      if (chosenColors.chasis && PALETTES.chasis[chosenColors.chasis]) {
        const colorHex = PALETTES.chasis[chosenColors.chasis].hex;
        selectable.chasis.forEach(mesh => {
          if (mesh.material && 'color' in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
          }
        });
      }

             // Aplicar colores de faders
       Object.entries(chosenColors.faders).forEach(([faderName, colorName]) => {
         if (PALETTES.faders[colorName]) {
           const colorHex = PALETTES.faders[colorName].hex;
           const faderMesh = selectable.faders.find(fader => fader.name === faderName);
           if (faderMesh) {
             // Aplicar el mismo material que MixoConfigurator para faders
             faderMesh.material = new THREE.MeshStandardMaterial({ 
               color: colorHex, 
               metalness: 0, 
               roughness: 1 
             });
           }
         }
       });
    }
  }, [selectable, chosenColors]);

     // Forzar color rosa en faders cuando se cargan
   useEffect(() => {
     if (selectable.faders.length > 0) {
       console.log('🎨 Applying black color by default to all faders...');
       selectable.faders.forEach((fader, index) => {
         const negroColor = PALETTES.faders['Black'].hex;
         // Aplicar el mismo material que MixoConfigurator para faders
         fader.material = new THREE.MeshStandardMaterial({ 
           color: negroColor, 
           metalness: 0, 
           roughness: 1 
         });
         console.log(`✅ Color negro aplicado a fader ${index + 1}:`, fader.name);
       });
     }
   }, [selectable.faders.length]);

  // Función para cambiar vista
  const changeView = useCallback((view: 'normal' | 'chasis' | 'faders') => {
    setCurrentView(view);

    // Limpiar glow effects al cambiar vista
    if (selectedForColoring) {
      setEmissive(selectedForColoring, 0x000000);
    }
    selectedFaders.forEach(fader => setEmissive(fader, 0x000000));

    if (view === 'chasis' && selectable.chasis.length > 0) {
      setSelectedForColoring(selectable.chasis[0]);
    } else {
      setSelectedForColoring(null);
    }

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
  }, [selectable, selectedForColoring, setEmissive, selectedFaders]);

  // Función para cambiar color
  const changeColor = useCallback((colorName: string) => {
    if (!selectedForColoring) return;

    const meshName = selectedForColoring.name.toLowerCase();
    let palette: Record<string, PaletteColor> | null = null;
    let colorKey: string | null = null;

    if (meshName.includes('cubechasis')) {
      palette = PALETTES.chasis;
      colorKey = 'chasis';
    } else if (meshName.includes('fader')) {
      palette = PALETTES.knobs;
      colorKey = selectedForColoring.name;
    }

    if (palette && colorKey && palette[colorName]) {
      const colorHex = palette[colorName].hex;
      if (selectedForColoring.material && 'color' in selectedForColoring.material) {
        (selectedForColoring.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorHex.replace('#', ''), 16));
      }

      setChosenColors(prev => {
        if (colorKey === 'chasis') {
          return {
            ...prev,
            chasis: colorName
          };
        } else {
          return {
            ...prev,
            faders: {
              ...prev.faders,
              [colorKey!]: colorName
            }
          };
        }
      });
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
    if (currentView === 'faders') {
      objectsToIntersect = selectable.faders;
    } else if (currentView === 'normal') {
      objectsToIntersect = selectable.faders;
    }
    
    if (objectsToIntersect.length === 0) return;
    
    const intersects = raycaster.intersectObjects(objectsToIntersect, false);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const name = clickedMesh.name.toLowerCase();
      
      if (name.includes('fader')) {
        console.log('Click detectado en fader:', name, 'Vista actual:', currentView);
        
        if (event.shiftKey) {
          if (selectedFaders.length === 0 && selectedForColoring && selectedForColoring !== clickedMesh) {
            setSelectedFaders([selectedForColoring, clickedMesh]);
            setSelectedForColoring(null);
            // Aplicar glow a ambos faders seleccionados
            setEmissive(selectedForColoring, 0x444444);
            setEmissive(clickedMesh, 0x444444);
          } else {
            setSelectedForColoring(null);
            setSelectedFaders(prev => {
              if (prev.length === 0) {
                setEmissive(clickedMesh, 0x444444);
                return [clickedMesh];
              }
              const already = prev.includes(clickedMesh);
              let newSelected;
              if (already) {
                newSelected = prev.filter(obj => obj !== clickedMesh);
                // Quitar glow del fader deseleccionado
                setEmissive(clickedMesh, 0x000000);
              } else {
                newSelected = [...prev, clickedMesh];
                setEmissive(clickedMesh, 0x444444);
              }
              // Aplicar glow a todos los faders seleccionados
              newSelected.forEach(fader => setEmissive(fader, 0x444444));
              return newSelected;
            });
          }
        } else {
          setSelectedFaders([]);
          setSelectedForColoring(clickedMesh);
          // Aplicar glow al fader seleccionado
          setEmissive(clickedMesh, 0x444444);
        }
      } else if (name.includes('cubechasis')) {
        setSelectedFaders([]);
        setSelectedForColoring(clickedMesh);
      }
    } else {
      setSelectedForColoring(null);
      setSelectedFaders([]);
    }
  }, [currentView, selectable, selectedForColoring, setEmissive, selectedFaders]);

  // Función para obtener título
  const getTitle = () => {
    if (currentView === 'chasis') {
      return "CHOOSE THE CHASSIS COLOR";
    } else if (currentView === 'faders') {
      return "CUSTOMIZE THE FADERS";
    }
    return "🎵 FADO";
  };

  // Función para obtener colores actuales
  const getCurrentColors = () => {
    if (currentView === 'chasis') {
      return PALETTES.chasis;
    } else if (currentView === 'faders') {
      return PALETTES.faders;
    }
    return PALETTES.chasis; // Por defecto
  };

  // Función para aplicar color
  const applyColor = useCallback((name: string, colorData: PaletteColor) => {
    if (currentView === 'chasis') {
      setChosenColors(prev => ({ ...prev, chasis: name }));
      selectable.chasis.forEach(mesh => {
        if (mesh.material && 'color' in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(parseInt(colorData.hex.replace('#', ''), 16));
        }
      });
    } else if (currentView === 'faders' && selectedFaders.length > 0) {
      console.log('Applying color to multiple faders:', selectedFaders.map(f => f.name), 'Color:', name);
      const newChosenColors = { ...chosenColors, faders: { ...chosenColors.faders } };
      
      selectedFaders.forEach(fader => {
        // Aplicar el mismo material que MixoConfigurator para faders
        fader.material = new THREE.MeshStandardMaterial({ 
          color: colorData.hex, 
          metalness: 0, 
          roughness: 1 
        });
        newChosenColors.faders[fader.name] = name;
      });
      
      setChosenColors(newChosenColors);
      setSelectedFaders([]);
      return;
    } else if (currentView === 'faders' && selectedForColoring) {
      console.log('Applying color to individual fader:', selectedForColoring.name, 'Color:', name);
      setChosenColors(prev => ({
        ...prev,
        faders: { ...prev.faders, [selectedForColoring.name]: name }
      }));
      
      // Aplicar el mismo material que MixoConfigurator para faders
      selectedForColoring.material = new THREE.MeshStandardMaterial({ 
        color: colorData.hex, 
        metalness: 0, 
        roughness: 1 
      });
      console.log('Material applied to fader');
    }
  }, [currentView, selectable, selectedForColoring, selectedFaders, chosenColors]);

  // Enviar configuración por email
  const handleOpenPayment = useCallback(() => {
    const emailDestino = 'tu-email-de-negocio@ejemplo.com';
    const asunto = 'Configuración de Fado';
    const colorSummary = `\nHola,\n\nEsta es mi configuración para el Fado:\n\n- Chasis: ${chosenColors.chasis}\n- Faders: ${Object.values(chosenColors.faders).join(', ') || 'Default'}\n\n(Adjunto también los datos en formato JSON para precisión: ${JSON.stringify(chosenColors)})\n\n¡Gracias!\n`;
    const mailtoLink = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(colorSummary)}`;
    window.location.href = mailtoLink;
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
    const currencyConfig = getFadoCurrencyConfig(selectedCurrency);
    
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
      description: `Fado Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`,
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
      extra1: 'Fado',
      extra2: chosenColors.chasis || 'Custom',
      extra3: `Applied colors - Faders: ${Object.keys(chosenColors.faders || {}).length}`,
      extra4: `Fado Configurator - ${selectedCurrency} ${currencyConfig.symbol}${currencyConfig.amount}`,
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

  const menuIcons = [
    { 
      id: 'normal', 
      icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z',
      title: 'Full View - See complete MIDI controller'
    },
    { 
      id: 'chasis', 
      icon: 'fado.png', 
      isImage: true,
      title: 'Customize Chassis - Change main body color'
    },
    { 
      id: 'faders', 
      icon: 'fader.png', 
      isImage: true,
      title: 'Customize Faders - Change slider control colors'
    }
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
            backgroundImage: 'url(/textures/fondo.jpg)',
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
        {/* Botón de inicio (izquierda) */}
        <div 
          className="fixed top-2 md:top-4 z-50 flex items-center gap-2 md:gap-3"
          style={{ left: '80px' }}
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
            FADO
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

                 {/* Panel de UI */}
         <div
           style={{
             position: 'fixed',
             top: 0,
             width: currentView === 'normal' ? 'clamp(80px, 20vw, 112px)' : 'clamp(280px, 70vw, 320px)',
             height: '100vh',
             display: 'flex',
             zIndex: 10,
             transition: 'all 0.4s ease'
           }}
           className="mobile-panel right-[-35px] md:right-[-20px]"
         >

          {/* Columna de controles de vista */}
          <div 
            style={{
              width: 'clamp(60px, 15vw, 112px)',
              flexShrink: 0,
              paddingTop: 'clamp(20px, 5vh, 160px)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 6px)' }}>
              {menuIcons.map(({ id, icon, isImage, title }) => (
                <button
                  key={id}
                  onClick={
                    id === 'faders'
                      ? () => changeView(id as 'normal' | 'chasis' | 'faders')
                      : () => changeView(id as 'normal' | 'chasis' | 'faders')
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
                    cursor: 'pointer',
                    background: currentView === id 
                      ? 'linear-gradient(to bottom right, #00FFFF, #0080FF)' 
                      : 'linear-gradient(to bottom right, #000000, #1a1a1a)',
                    boxShadow: currentView === id ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #00FFFF, #0080FF)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
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
                    if (currentView !== id) {
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
                      alt="Menu icon"
                      style={{
                        width: 'clamp(20px, 5vw, 40px)',
                        height: 'clamp(20px, 5vw, 40px)',
                        objectFit: 'contain',
                        margin: 'auto',
                        filter: id === 'faders' ? 'brightness(1.5) contrast(1.3) saturate(1.2) drop-shadow(0 0 6px rgba(0, 255, 255, 0.5))' : 'none',
                        backgroundColor: id === 'faders' ? 'rgba(0, 0, 0, 0.1)' : 'transparent'
                      }}
                      onError={(e) => {
                        console.error('Error loading image:', e);
                        console.log('Attempted to load:', `textures/${icon}`);
                      }}
                    />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox={id === 'faders' ? '0 0 24 24' : '0 0 24 24'}
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

          {/* Contenido de la UI */}
          <div 
            style={{
              flex: 1,
              padding: 'clamp(4px, 1vw, 8px)',
              display: 'flex',
              flexDirection: 'column'
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
              <div style={{ marginTop: 'clamp(16px, 4vw, 24px)' }} className="animate-fadeIn">
                <p 
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(10px, 2.5vw, 14px)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    margin: '0 0 clamp(8px, 2vw, 12px) 0',
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
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: '1px solid #a259ff',
                        boxShadow: '0 0 6px 1px rgba(162, 89, 255, 0.33)',
                        transition: 'all 0.2s ease',
                        backgroundColor: colorData.hex,
                        animationDelay: `${index * 50}ms`
                      }}
                      title={name}
                      onClick={() => applyColor(name, colorData)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
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
            {currentView === 'faders' && (selectedForColoring || selectedFaders.length > 0) && (
              <div 
                style={{
                  marginBottom: 'clamp(12px, 3vw, 16px)',
                  padding: 'clamp(8px, 2vw, 12px)',
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
                  {selectedFaders.length > 0 
                    ? `Selección múltiple (${selectedFaders.length} elementos)`
                    : `Seleccionado: ${selectedForColoring ? selectedForColoring.name : ''}`
                  }
                </h4>
                <p 
                  style={{
                    color: '#d1d5db',
                    fontSize: 'clamp(10px, 2vw, 14px)'
                  }}
                  className="animate-fadeIn"
                >
                  {selectedFaders.length > 0
                    ? 'Haz clic en un color para aplicarlo a todos los faders seleccionados'
                    : 'Haz clic en un color para aplicarlo al fader seleccionado'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón de comprar (solo visible en vista normal) */}
        {currentView === 'normal' && (
          <button 
            onClick={handleOpenPayment}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 text-lg font-bold uppercase tracking-wide text-black bg-purple-400 border-none rounded cursor-pointer transition-all duration-200 shadow-lg hover:bg-yellow-200 hover:scale-105 hover:shadow-xl shadow-[0_0_8px_2px_#a259ff80,0_0_16px_4px_#0ff5]"
          >
            Finalizar y Enviar Configuración
          </button>
        )}

        {/* Flujo de pago eliminado: ahora se usa mailto */}
      </div>
    </div>
  );
};

export default FadoConfigurator; 