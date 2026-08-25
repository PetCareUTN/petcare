import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function visibleTextLength(value: string): number {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/gi, ' ').length;
}

export function MaxRichTextLength(
  maxLength: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'maxRichTextLength',
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [maxLength],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value !== 'string' || visibleTextLength(value) <= maxLength
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} no puede superar los ${maxLength} caracteres`;
        },
      },
    });
  };
}
