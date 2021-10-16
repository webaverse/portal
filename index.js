import * as THREE from 'three';
import {Reflector} from './Reflector.js';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useInternals} = metaversefile;
// import {scene, renderer, camera, app} from 'app';
// console.log('loaded app', app);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localMatrix = new THREE.Matrix4();

/* const scene = new THREE.Scene();
// scene.background = new THREE.Color(0xEEEEEE);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.5, 2);
camera.rotation.order = 'YXZ'; */

/* const ambientLight = new THREE.AmbientLight(0xFFFFFF);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
directionalLight.position.set(0.5, 1, 0.5).multiplyScalar(100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
directionalLight2.position.set(-0.5, 0.1, 0.5).multiplyScalar(100);
scene.add(directionalLight2); */

export default () => {
  const app = useApp();
  
  const endPortalComponent = app.getComponent('endPortal');
  let endPortalPosition;
  let endPortalQuaternion;
  let endPortalScale;
  if (endPortalComponent) {
    if (endPortalComponent.position) {
      endPortalPosition = new THREE.Vector3().fromArray(endPortalComponent.position);
    }
    if (endPortalComponent.quaternion) {
      endPortalQuaternion = new THREE.Quaternion().fromArray(endPortalComponent.quaternion);
    }
    if (endPortalComponent.scale) {
      endPortalScale = new THREE.Vector3().fromArray(endPortalComponent.scale);
    }
  }
  if (!endPortalPosition) {
    endPortalPosition = new THREE.Vector3();
    // endPortalPosition = new THREE.Vector3(0, 0, 5);
  }
  if (!endPortalQuaternion) {
    endPortalQuaternion = new THREE.Quaternion();
    // endPortalQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  }
  if (!endPortalScale) {
    endPortalScale = new THREE.Vector3(1, 1, 1);
  }
  
  const mirrorMesh = (() => {
    const mirrorWidth = 1;
    const mirrorHeight = 1;
    const geometry = new THREE.PlaneBufferGeometry(mirrorWidth, mirrorHeight);
    const options = {
      clipBias: 0.003,
      textureWidth: 1024 * window.devicePixelRatio,
      textureHeight: 1024 * window.devicePixelRatio,
      color: 0xFF0000,
      addColor: 0x300000,
      recursion: 1,
      transparent: true,
      matrixWorld: new THREE.Matrix4(),
    };
    const mesh = new Reflector(geometry, options);
    /* mesh.position.set(0, 1, -100);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = Math.PI/2; */
    mesh.position.copy(endPortalPosition);
    mesh.quaternion.copy(endPortalQuaternion);
    mesh.scale.copy(endPortalScale);
    mesh.updateMatrixWorld();
    mesh.options = options;
    mesh.frustumCulled = false;

    const borderMesh = new THREE.Mesh(
      new THREE.BoxBufferGeometry(mirrorWidth + 0.1, mirrorHeight + 0.1, 0.1)
        .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.1/2 - 0.01)),
      new THREE.MeshPhongMaterial({
        color: 0x5c6bc0,
      })
    );
    mesh.add(borderMesh);

    /* mesh.onBeforeRender2 = () => {
      if (rig) {
        rig.undecapitate();
      }
    };
    mesh.onAfterRender2 = () => {
      if (rig && session) {
        rig.decapitate();
      }
    }; */

    return mesh;
  })();
  app.add(mirrorMesh);
  const mirrorMesh2 = (() => {
    const mirrorWidth = 1;
    const mirrorHeight = 1;
    const geometry = new THREE.PlaneBufferGeometry(mirrorWidth, mirrorHeight)
      // .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -mirrorWidth))
      // .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2)));
    const options = {
      clipBias: 0.003,
      textureWidth: 1024 * window.devicePixelRatio,
      textureHeight: 1024 * window.devicePixelRatio,
      color: 0x0000FF,
      addColor: 0x300000,
      recursion: 1,
      transparent: true,
      matrixWorld: null,
      otherMesh: null,
    };
    const mesh = new Reflector(geometry, options);
    // mesh.position.set(0, 1, 0);
    // mesh.rotation.order = 'YXZ';
    // mesh.rotation.y = Math.PI;
    // mesh.updateMatrixWorld();
    mesh.options = options;
    mesh.frustumCulled = false;

    const borderMesh = new THREE.Mesh(
      new THREE.BoxBufferGeometry(mirrorWidth + 0.1, mirrorHeight + 0.1, 0.1)
        .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.1/2 - 0.01)),
      new THREE.MeshPhongMaterial({
        color: 0x5c6bc0,
      })
    );
    mesh.add(borderMesh);

    /* mesh.onBeforeRender2 = () => {
      if (rig) {
        rig.undecapitate();
      }
    };
    mesh.onAfterRender2 = () => {
      if (rig && session) {
        rig.decapitate();
      }
    }; */

    return mesh;
  })();
  app.add(mirrorMesh2);
  mirrorMesh.options.otherMesh = mirrorMesh2;
  mirrorMesh.options.matrixWorld = mirrorMesh2.matrixWorld;
  mirrorMesh2.options.otherMesh = mirrorMesh;
  mirrorMesh2.options.matrixWorld = mirrorMesh.matrixWorld;

  // window.mirrorMesh = mirrorMesh;
  // window.mirrorMesh2 = mirrorMesh2;

  const lastPosition = new THREE.Vector3();
  useFrame(() => {
    const {camera} = useInternals();
    const currentPosition = camera.position.clone().add(new THREE.Vector3(0, 0, -camera.near).applyQuaternion(camera.quaternion));
    const sortedMirrorMeshes = [mirrorMesh, mirrorMesh2].sort((a, b) => {
      const aDistance = a.getWorldPosition(localVector).distanceTo(currentPosition);
      const bDistance = b.getWorldPosition(localVector).distanceTo(currentPosition);
      return aDistance - bDistance;
    });
    if (sortedMirrorMeshes[0].getWorldPosition(localVector).distanceTo(currentPosition) < 3) {
      sortedMirrorMeshes[0].enabled = true;
      sortedMirrorMeshes[1].enabled = false;
      // for (const reflector of [mirrorMesh, mirrorMesh2]) ;
      // }
    } else {
      sortedMirrorMeshes[0].enabled = false;
      sortedMirrorMeshes[1].enabled = false;
    }

    for (const reflector of [mirrorMesh, mirrorMesh2]) {
      if (reflector.update(camera, currentPosition, lastPosition)) {
        /* orbitControls.target.copy(camera.position)
          .add(new THREE.Vector3(0, 0, -1.5).applyQuaternion(camera.quaternion));
        camera.lookAt(orbitControls.target); */
        break;
      }
    }
    lastPosition.copy(currentPosition);
  });
  // renderer.setAnimationLoop(animate);
  
  return app;
};