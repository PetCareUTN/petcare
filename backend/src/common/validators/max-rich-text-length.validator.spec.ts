import { validate } from 'class-validator';
import { MaxRichTextLength } from './max-rich-text-length.validator';

class RichTextDto {
  @MaxRichTextLength(250)
  value!: string;
}

describe('MaxRichTextLength', () => {
  it('acepta hasta 250 caracteres visibles', async () => {
    const dto = new RichTextDto();
    dto.value = `<p>${'a'.repeat(250)}</p>`;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rechaza mas de 250 caracteres visibles', async () => {
    const dto = new RichTextDto();
    dto.value = `<p>${'a'.repeat(251)}</p>`;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.maxRichTextLength).toContain('250');
  });

  it('cuenta una entidad HTML como un caracter visible', async () => {
    const dto = new RichTextDto();
    dto.value = `<p>${'a'.repeat(249)}&amp;</p>`;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
