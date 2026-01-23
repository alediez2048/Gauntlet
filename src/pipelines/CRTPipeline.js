import Phaser from 'phaser';

export default class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game: game,
      name: 'CRTPipeline',
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        varying vec2 outTexCoord;
        void main() {
          vec2 uv = outTexCoord;
          vec2 d = uv - 0.5;
          float r = dot(d, d);
          uv = 0.5 + d * (1.0 + 0.03 * r);
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          float scanline = sin(uv.y * 800.0) * 0.04;
          vec4 color = texture2D(uMainSampler, uv);
          color.rgb += scanline;
          color.rgb *= 1.1;
          gl_FragColor = color;
        }
      `
    });
  }
}
