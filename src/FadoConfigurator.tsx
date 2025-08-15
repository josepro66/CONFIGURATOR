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
      chasis: 'Gris',
      faders: {}
    };
  });
  const [selectable, setSelectable] = useState<Selectable>({ chasis: [], faders: [] });
  
  // Estado para selección múltiple de faders
  const [selectedFaders, setSelectedFaders] = useState<THREE.Mesh[]>([]);

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
    faders: {
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
      chasis: 'Gris',
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
          color: PALETTES.chasis['Gris'].hex, 
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
          const defaultColor = 'Negro';
          child.material = new THREE.MeshStandardMaterial({ color: PALETTES.faders[defaultColor].hex, metalness: 0, roughness: 1 });
          newSelectable.faders.push(child);
          newChosenColors.faders[child.name] = defaultColor;
        } else {
          if (child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.color) {
              const lightness = (mat.color.r + mat.color.g + mat.color.b) / 3;
              if (lightness < 0.8) {
                const defaultColor = 'Negro';
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
        console.log('FadoConfigurator: Modelo cargado exitosamente');
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
       console.log('🎨 Aplicando color negro por defecto a todos los faders...');
       selectable.faders.forEach((fader, index) => {
         const negroColor = PALETTES.faders['Negro'].hex;
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
      return "🎛️ CHASIS";
    } else if (currentView === 'faders') {
      return "🎚️ FADERS";
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
      console.log('Aplicando color a faders múltiples:', selectedFaders.map(f => f.name), 'Color:', name);
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
      console.log('Aplicando color a fader individual:', selectedForColoring.name, 'Color:', name);
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
       console.log('Material de Mixo aplicado al fader');
    }
  }, [currentView, selectable, selectedForColoring, selectedFaders, chosenColors]);

  // Función para abrir modal de pago
  const handleOpenPayment = useCallback(() => {
    // Aquí puedes implementar la lógica del modal de pago
    console.log('Abrir modal de pago');
  }, []);

  const menuIcons = [
    { id: 'normal', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z', title: '🎵 Vista General' },
    { id: 'chasis', icon: 'fado.png', title: '🎛️ Chasis', isImage: true },
    { id: 'faders', icon: 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z', title: '🎚️ Faders' }
  ];

  // Configuración de partículas
  const particlesInit = async (main: any) => {
    await loadFull(main);
  };

  return (
    <PayPalScriptProvider options={{ clientId: "test", currency: "USD" }}>
      <div className="w-full h-screen bg-black text-gray-200 overflow-hidden relative">
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
            background: "linear-gradient(120deg,rgb(42, 40, 51) 0%, #00FFF0 60%, #D8D6F2 100%)"
          }}
        />
        {/* Fondo de partículas global */}
        <Particles
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
        />
        {/* Botón de inicio (izquierda) */}
        <div style={{ position: 'fixed', top: 16, left: 6, zIndex: 51, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => window.location.href = 'https://www.crearttech.com/' }
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

        {/* Título y logo centrados */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
          <img
            src="models/logo.png"
            alt="Logo"
            className="h-8 w-auto"
            style={{
              filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)',
            }}
          />
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
        <main className="flex w-full h-full" style={{ minHeight: "100vh", height: "100vh", position: "relative", zIndex: 1, overflow: "hidden" }}>
          {/* Canvas container */}
          <div className="flex-grow h-full" style={{ position: "relative", zIndex: 1, background: "linear-gradient(180deg,rgb(5, 1, 73) 0%,rgb(82, 2, 46) 100%)" }}> 
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
          className={`fixed top-0 right-0 h-screen border-l border-gray-700 shadow-2xl transition-all duration-400 flex overflow-hidden z-10 ${
            currentView === 'normal' ? 'w-28' : 'w-[320px]'
          }`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(26, 26, 26, 0.2) 25%, rgba(10, 10, 10, 0.2) 50%, rgba(26, 26, 26, 0.2) 75%, rgba(0, 0, 0, 0.2) 100%)',
            boxShadow: '0 0 16px 2px rgba(0, 255, 255, 0.4), -6px 0 16px 0 rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0,0,0,0.8)',
            borderLeft: '2px solid rgba(0, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 10
          }}
        >

          {/* Columna de controles de vista */}
          <div className="w-28 p-4 flex-shrink-0" style={{ paddingTop: '200px' }}>
            <div className="flex flex-col gap-1.5">
              {menuIcons.map(({ id, icon, title, isImage }) => (
                <button
                  key={id}
                  onClick={
                    id === 'faders'
                      ? () => changeView(id as 'normal' | 'chasis' | 'faders')
                      : () => changeView(id as 'normal' | 'chasis' | 'faders')
                  }
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
                      viewBox={id === 'faders' ? '0 0 24 24' : '0 0 24 24'}
                      className="w-4/5 h-4/5 mx-auto my-auto fill-white text-white"
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
          <div className="flex-1 p-2 flex flex-col">
            {/* Header */}
            <div
              className={`flex items-center pb-5 border-b border-gray-600 pl-0 ${currentView === 'normal' ? 'justify-center items-center gap-0' : 'justify-center gap-2'}`}
              style={currentView === 'normal' ? { minHeight: '48px' } : {}}
            >
              {currentView === 'normal' ? (
                <img
                  src="models/logo.png"
                  alt="Logo"
                  className="h-6 w-auto"
                  style={{
                    filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)',
                  }}
                />
              ) : (
                <>
                  <img
                    src="models/logo.png"
                    alt="Logo"
                    className="h-8 w-auto"
                    style={{
                      filter: 'drop-shadow(0 0 8px #a259ff) drop-shadow(0 0 16px #0ff)',
                    }}
                  />
                  <h2
                    className="m-0 font-bold tracking-widest text-xl md:text-3xl whitespace-normal break-words text-left"
                    style={{
                      fontFamily: 'Gotham Black, Arial, sans-serif',
                      color: '#fff',
                      textShadow: '0 0 12px #a259ff, 0 0 24px #0ff, 0 0 2px #fff',
                      letterSpacing: '0.04em',
                      marginLeft: '-0.25em',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    FADO
                  </h2>
                </>
              )}
            </div>

            {/* Sección de colores */}
            <div className="mt-6 animate-fadeIn">
              <p className="font-black text-sm tracking-wide uppercase m-0 mb-3 text-gray-200 text-left animate-fadeIn">
                {getTitle()}
              </p>
              <div className="grid grid-cols-2 gap-x-0 gap-y-0 p-0 justify-items-end ml-auto animate-scaleIn">
                {Object.entries(getCurrentColors()).map(([name, colorData], index) => (
                  <div
                    key={name}
                    className="w-10 h-10 rounded-full cursor-pointer border border-[#a259ff] shadow-[0_0_6px_1px_#a259ff55] transition-all duration-200 hover:scale-110 animate-fadeInUp"
                    style={{ 
                      backgroundColor: colorData.hex,
                      animationDelay: `${index * 50}ms`
                    }}
                    title={name}
                    onClick={() => applyColor(name, colorData)}
                  />
                ))}
              </div>
            </div>

            {/* Información de selección múltiple */}
            {(currentView === 'faders' && selectedForColoring) || (currentView === 'faders' && selectedFaders.length > 0) && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg animate-scaleIn">
                <h4 className="text-lg font-semibold text-white mb-2 animate-fadeIn">
                  {selectedFaders.length > 0 
                    ? `Selección múltiple (${selectedFaders.length} elementos)`
                    : `Seleccionado: ${selectedForColoring ? selectedForColoring.name : ''}`
                  }
                </h4>
                <p className="text-gray-300 text-sm animate-fadeIn">
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
            AÑADIR AL CARRITO
          </button>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default FadoConfigurator; 