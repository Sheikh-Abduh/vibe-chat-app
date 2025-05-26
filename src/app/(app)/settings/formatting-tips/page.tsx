
"use client";

import React from 'react'; // Added this line
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Bold, Italic, Strikethrough, Underline, Superscript, Subscript } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FormattingTip {
  name: string;
  syntax: string;
  example: string;
  renderedExample: JSX.Element;
  icon: React.ElementType;
}

const formattingTips: FormattingTip[] = [
  { name: "Bold", syntax: "**text** or __text__", example: "**This is bold**", renderedExample: <strong>This is bold</strong>, icon: Bold },
  { name: "Italic", syntax: "*text* or _text_", example: "*This is italic*", renderedExample: <em>This is italic</em>, icon: Italic },
  { name: "Strikethrough", syntax: "~~text~~", example: "~~This is strikethrough~~", renderedExample: <del>This is strikethrough</del>, icon: Strikethrough },
  { name: "Underline", syntax: "++text++", example: "++This is underlined++", renderedExample: <u>This is underlined</u>, icon: Underline },
  { name: "Superscript", syntax: "^^text^^", example: "This is ^^superscript^^", renderedExample: <>This is <sup>superscript</sup></>, icon: Superscript },
  { name: "Subscript", syntax: "vvtextvv", example: "This is vvsubscriptvv", renderedExample: <>This is <sub>subscript</sub></>, icon: Subscript },
];

export default function FormattingTipsPage() {
  const router = useRouter();

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
          <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <FileText className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Text Formatting Tips
        </h1>
      </div>

      <Card className="w-full bg-card border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">How to Format Your Messages</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Use these simple syntax options to add style to your text in chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {formattingTips.map((tip, index) => (
            <React.Fragment key={tip.name}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 items-center">
                <div className="flex items-center font-semibold text-foreground">
                  <tip.icon className="mr-2 h-5 w-5 text-accent" />
                  {tip.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1.5 py-0.5 rounded-sm text-sm font-mono">{tip.syntax}</code>
                </div>
                <div className="text-sm text-foreground italic">
                  Example: {tip.renderedExample}
                </div>
              </div>
              {index < formattingTips.length - 1 && <Separator className="bg-border/50 my-3" />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
