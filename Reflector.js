/**
 * @author Slayvin / http://slayvin.net
 */

import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useInternals, useBeforeRender, useAfterRender} = metaversefile;

let rendering = false;
const reflectors = [];

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localPlane = new THREE.Plane();
const localMatrix = new THREE.Matrix4();

const {camera} = useInternals();

class Reflector extends THREE.Mesh {
  constructor( geometry, options ) {
    super(geometry);

    this.type = 'Reflector';

    var scope = this;

    options = options || {};

    var color = ( options.color !== undefined ) ? new THREE.Color( options.color ) : new THREE.Color( 0x7F7F7F );
    var textureWidth = options.textureWidth || 512;
    var textureHeight = options.textureHeight || 512;
    var clipBias = options.clipBias || 0;
    var shader = options.shader || Reflector.ReflectorShader;
    var recursion = options.recursion !== undefined ? options.recursion : 0;

    //

    var reflectorPlane = new THREE.Plane();
    var normal = new THREE.Vector3();
    var reflectorWorldPosition = new THREE.Vector3();
    var cameraWorldPosition = new THREE.Vector3();
    var rotationMatrix = new THREE.Matrix4();
    var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
    var clipPlane = new THREE.Vector4();

    var view = new THREE.Vector3();
    var target = new THREE.Vector3();
    var q = new THREE.Vector4();

    // var textureMatrix = new THREE.Matrix4();
    var virtualCamera = new THREE.PerspectiveCamera();

    var parameters = {
      // minFilter: THREE.LinearFilter,
      // magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      // encoding: THREE.sRGBEncoding,
      // stencilBuffer: false,
    };

    const _makeRenderTarget = () => {
      var renderTarget = new THREE.WebGLRenderTarget( textureWidth, textureHeight, parameters );

      if ( ! THREE.Math.isPowerOfTwo( textureWidth ) || ! THREE.Math.isPowerOfTwo( textureHeight ) ) {

        renderTarget.texture.generateMipmaps = false;

      }
      
      return renderTarget;
    };
    const renderTargets = [
      _makeRenderTarget(),
      _makeRenderTarget(),
      _makeRenderTarget(),
      _makeRenderTarget(),
    ];
    let renderTargetIndex = 0;
    const getReadRenderTarget = () => renderTargets[renderTargetIndex];
    const getWriteRenderTarget = () => renderTargets[(renderTargetIndex + 1) % 4];
    const getOldRenderTarget = () => renderTargets[(renderTargetIndex + 2) % 4];
    const getVeryOldRenderTarget = () => renderTargets[(renderTargetIndex + 3) % 4];
    const _swapRenderTargets = () => {
      renderTargetIndex = (renderTargetIndex + 1) % 4;
    };

    var material = new THREE.ShaderMaterial( {
      uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      transparent: options.transparent,
    } );

    material.uniforms[ "tDiffuse" ].value = getReadRenderTarget().texture;
    material.uniforms[ "color" ].value = color;
    // material.uniforms[ "textureMatrix" ].value = textureMatrix;

    this.material = material;

    this.enabled = true;

    // const cubeMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({color: color}));

    let uniformsNeedUpdate = material.uniformsNeedUpdate;
    let forceUniformsNeedUpdate = false;
    Object.defineProperty(material, 'uniformsNeedUpdate', {
      get() {
        return forceUniformsNeedUpdate || uniformsNeedUpdate;
      },
      set(v) {
        uniformsNeedUpdate = v;
      },
    });

    const globalCamera = camera;
    this.onBeforeRender = function ( renderer, scene, camera ) {
      forceUniformsNeedUpdate = true;
      
      /* for (const reflector of reflectors) {
        if (reflector !== this) {
          reflector.visible = false;
        }
      } */
      
      material.uniforms[ "tDiffuse" ].value = getOldRenderTarget().texture;
      
      if (rendering) {
        material.uniforms[ "textureMatrix" ].value
          .copy(
            localMatrix.copy(camera.projectionMatrix)
            // localMatrix.identity()
          )
          .premultiply(
            localMatrix.compose(
              this.getWorldPosition(localVector),
              this.getWorldQuaternion(localQuaternion),
              localVector2.set(1, 1, 1)
            )
          )
          .premultiply(
            localMatrix.copy(camera.matrixWorld).invert()
          )
          /* .premultiply(
            localMatrix.copy(camera.projectionMatrix).invert()
          ) */
          .premultiply(
            localMatrix.copy(camera.projectionMatrix).invert()
          )
          
        
        return;
      } else {
        material.uniforms[ "textureMatrix" ].value.identity();
      }
      

      rendering = true;
      
      useBeforeRender();

      if (this.enabled) {
        /* this.visible = false;
        if (this.options.otherMesh) {
          this.options.otherMesh.visible = false;
        } */

        // app.object.add(cubeMesh);
        
        /* const cameraPosition = new THREE.Vector3();
        const cameraQuaternion = new THREE.Quaternion();
        const cameraScale = new THREE.Vector3();
        camera.matrixWorld.decompose(cameraPosition, cameraQuaternion, cameraScale); */
        const cameraPosition = camera.position;
        const cameraQuaternion = camera.quaternion;
        const cameraScale = camera.scale;
        
        // console.log('pre quat', cameraPosition.clone(), color.toArray());
        
        const portalPosition = new THREE.Vector3();
        const portalQuaternion = new THREE.Quaternion();
        const portalScale = new THREE.Vector3();
        scope.matrixWorld.decompose(portalPosition, portalQuaternion, portalScale);
        
        const portal2Position = new THREE.Vector3();
        const portal2Quaternion = new THREE.Quaternion();
        const portal2Scale = new THREE.Vector3();
        options.matrixWorld.decompose(portal2Position, portal2Quaternion, portal2Scale);
        portal2Quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));

        const oldWriteRt = getWriteRenderTarget();

        const portalPlane = localPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(portalQuaternion), portalPosition);
        if (portalPlane.normal.dot(localVector.set(0, 0, -1).applyQuaternion(portalQuaternion)) < 0) {
          const portalPoint = portalPlane.projectPoint(cameraPosition, new THREE.Vector3());
          // console.log('normal coplanar', new THREE.Vector3(0, 0, 1).applyQuaternion(portalQuaternion), portalPosition.clone(), cameraPosition.clone(), portalPoint.clone());
          virtualCamera.position.copy(portalPoint)
            .sub(portalPosition)
            .applyQuaternion(portalQuaternion.clone().invert())
            .applyQuaternion(portal2Quaternion)
            .add(portal2Position)
            .add(new THREE.Vector3(0, 0, portalPoint.distanceTo(cameraPosition)).applyQuaternion(portal2Quaternion));
          virtualCamera.quaternion.copy(portal2Quaternion);
          
          // cubeMesh.position.copy(virtualCamera.position);
          
          
          const portalHalfWidth = portalScale.x / 2;
          const portalHalfHeight = portalScale.y / 2;
          // const portalPosition = new Vector3().copy(portal.position);
          virtualCamera.updateMatrixWorld();
          virtualCamera.worldToLocal(portal2Position);

          let left   = portal2Position.x - portalHalfWidth;
          let right  = portal2Position.x + portalHalfWidth;
          let top    = portal2Position.y + portalHalfHeight;
          let bottom = portal2Position.y - portalHalfHeight;
          
          
          
          
          const {far} = camera;
          const distance = portalPoint.distanceTo(cameraPosition);
          const near = distance;
          /* const scale = near / distance;
          left   *= scale;
          right  *= scale;
          top    *= scale;
          bottom *= scale; */
          
          
          
          
          
          virtualCamera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
          virtualCamera.projectionMatrixInverse.copy(virtualCamera.projectionMatrix).invert();
          
          
          
          

          // Render

          /* renderer.setRenderTarget(renderTarget);
          renderer.clear(true, true, true);
          renderer.render(scene, virtualCamera);
          renderer.setRenderTarget(null); */

          var currentRenderTarget = renderer.getRenderTarget();

          var currentXrEnabled = renderer.xr.enabled;
          var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

          renderer.xr.enabled = false; // Avoid camera modification and recursion
          renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

          renderer.setRenderTarget( getWriteRenderTarget() );
          renderer.clear();
          renderer.render( scene, virtualCamera );

          renderer.xr.enabled = currentXrEnabled;
          renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

          renderer.setRenderTarget( currentRenderTarget );

          // Restore viewport

          var viewport = camera.viewport;

          if ( viewport !== undefined ) {

            renderer.state.viewport( viewport );

          }
        }
        
        _swapRenderTargets();
        /* if (getReadRenderTarget() !== oldWriteRt) {
          debugger;
        } */
        material.uniforms[ "tDiffuse" ].value = getReadRenderTarget().texture;
      } else {
        material.uniforms[ "tDiffuse" ].value = getOldRenderTarget().texture;
        /* var currentRenderTarget = renderer.getRenderTarget();

        var currentXrEnabled = renderer.xr.enabled;
        var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

        renderer.xr.enabled = false; // Avoid camera modification and recursion
        renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

        renderer.setRenderTarget( getWriteRenderTarget() );
        renderer.clear();
        // renderer.render( scene, virtualCamera );

        renderer.xr.enabled = currentXrEnabled;
        renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

        renderer.setRenderTarget( currentRenderTarget ); */
      }
      
      material.uniforms[ "textureMatrix" ].value.identity();

      rendering = false;
      /* if (this.enabled) {
        this.visible = true;
        if (this.options.otherMesh) {
          this.options.otherMesh.visible = true;
        }
      } */
      
      useAfterRender();
    };
    this.onAfterRender = (renderer, scene, camera) => {
      forceUniformsNeedUpdate = false;
    };

    /* this.getRenderTarget = function () {

      return renderTarget;

    }; */

    this.update = (camera, currentPosition, lastPosition) => {
      const cameraPosition = camera.position;
      const cameraQuaternion = camera.quaternion;
      const cameraScale = camera.scale;
      
      // console.log('pre quat', cameraPosition.clone(), color.toArray());
      
      const portalPosition = new THREE.Vector3();
      const portalQuaternion = new THREE.Quaternion();
      const portalScale = new THREE.Vector3();
      scope.matrixWorld.decompose(portalPosition, portalQuaternion, portalScale);
      
      const portal2Position = new THREE.Vector3();
      const portal2Quaternion = new THREE.Quaternion();
      const portal2Scale = new THREE.Vector3();
      options.matrixWorld.decompose(portal2Position, portal2Quaternion, portal2Scale);
      portal2Quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
      
      const line = new THREE.Line3(lastPosition, currentPosition);
      // console.log('got current position', currentPosition.toArray());
      const portalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(portalQuaternion), portalPosition);

      let intersection = portalPlane.intersectLine(line, new THREE.Vector3());
      if (intersection && portalPlane.distanceToPoint(lastPosition) > 0 && portalPlane.distanceToPoint(currentPosition) < 0) {
        const u = new THREE.Vector3(1, 0, 0).applyQuaternion(portalQuaternion).dot(intersection.clone().sub(portalPosition));
        const v = new THREE.Vector3(0, 1, 0).applyQuaternion(portalQuaternion).dot(intersection.clone().sub(portalPosition));

        if (u >= -portalScale.x/2 && u < portalScale.x/2 && v >= -portalScale.y/2 && v < portalScale.y/2) {
          // console.log('intersect', u, v, color.toArray());
          const portalPoint = portalPlane.projectPoint(cameraPosition, new THREE.Vector3());
          
          // const oldCameraPosition = cameraPosition.clone();
          cameraPosition
            .sub(portalPosition)
            .applyQuaternion(portalQuaternion.clone().invert())
            .applyQuaternion(portal2Quaternion)
            .add(portal2Position)
            // .add(oldCameraPosition);
          camera.quaternion
            .premultiply(portalQuaternion.clone().invert())
            .premultiply(portal2Quaternion);
          currentPosition.copy(camera.position)
            .add(new THREE.Vector3(0, 0, -camera.near).applyQuaternion(camera.quaternion));
        } else {
          intersection = null;
        }
      } else {
        intersection = null;
      }

      return !!intersection;
    };
    
    reflectors.push(this);

  }
}
Reflector.ReflectorShader = {

  uniforms: {

    'color': {
      value: null
    },

    'tDiffuse': {
      value: null
    },
    
    'textureMatrix': {
      value: new THREE.Matrix4(),
    }

  },

  vertexShader: [
    //  'uniform mat4 textureMatrix;',
    'varying vec2 vUv;',
    'uniform mat4 textureMatrix;',

    'const mat4 identityMatrix = mat4(1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.);',

    'void main() {',

    `
      if (textureMatrix == identityMatrix) {
        vUv = uv;
      } else {
        // vec4 uvPosition = vec4((uv.x - 0.5) * 2., (uv.y - 0.5) * 2., 0., 1.);
        vec4 uvPosition = vec4(uv.x, uv.y, 0., 1.);
        uvPosition = textureMatrix * uvPosition;
        uvPosition /= uvPosition.w;
        // vUv = (uvPosition.xy / 2.) + 0.5;
        vUv = uvPosition.xy;
        // vUv.y *= 0.5;
      }
    `,

    '	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}'
  ].join( '\n' ),

  fragmentShader: [
    'uniform vec3 color;',
    'uniform sampler2D tDiffuse;',
    'uniform mat4 textureMatrix;',
    'varying vec2 vUv;',

    'float blendOverlay( float base, float blend ) {',

    '	return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );',

    '}',

    'vec3 blendOverlay( vec3 base, vec3 blend ) {',

    '	return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );',

    '}',

    'void main() {',

    '	gl_FragColor = texture2D( tDiffuse, vUv );',

    '}'
  ].join( '\n' )
};
export {Reflector};